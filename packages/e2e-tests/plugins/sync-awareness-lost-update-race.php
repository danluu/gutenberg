<?php
/**
 * Plugin Name: Gutenberg Test Plugin, Sync Awareness Lost Update Race
 * Plugin URI: https://github.com/WordPress/gutenberg
 * Author: Gutenberg Team
 *
 * @package gutenberg-test-sync-awareness-lost-update-race
 */

/**
 * Loads the collaboration classes needed by the deterministic race endpoint.
 *
 * @return bool Whether the collaboration classes are available.
 */
function gutenberg_test_sync_awareness_lost_update_load_classes(): bool {
	if (
		interface_exists( 'WP_Sync_Storage' ) &&
		class_exists( 'WP_Sync_Post_Meta_Storage' ) &&
		class_exists( 'WP_HTTP_Polling_Sync_Server' ) &&
		class_exists( 'Gutenberg_Sync_Awareness_Merging_Storage' )
	) {
		return true;
	}

	$collaboration_file = WP_PLUGIN_DIR . '/gutenberg/lib/compat/wordpress-7.0/collaboration.php';
	if ( file_exists( $collaboration_file ) ) {
		require_once $collaboration_file;
	}

	return (
		interface_exists( 'WP_Sync_Storage' ) &&
		class_exists( 'WP_Sync_Post_Meta_Storage' ) &&
		class_exists( 'WP_HTTP_Polling_Sync_Server' )
	);
}

/**
 * Creates a test storage wrapper that injects a completed awareness write at
 * the same point a concurrent PHP request can complete in production.
 *
 * @param WP_Sync_Storage $server_storage    Storage used by the sync server.
 * @param WP_Sync_Storage $injection_storage Raw storage for injected completed writes.
 * @return WP_Sync_Storage Test storage wrapper.
 */
function gutenberg_test_sync_awareness_lost_update_create_race_storage( WP_Sync_Storage $server_storage, WP_Sync_Storage $injection_storage ): WP_Sync_Storage {
	return new class( $server_storage, $injection_storage ) implements WP_Sync_Storage {
		/**
		 * Storage object used by the production sync server under test.
		 *
		 * This may be the raw post-meta storage or Gutenberg's compatibility
		 * wrapper when the loaded Core server still uses the older read/write path.
		 *
		 * @var WP_Sync_Storage
		 */
		private WP_Sync_Storage $server_storage;

		/**
		 * Raw storage used to model a different completed request.
		 *
		 * @var WP_Sync_Storage
		 */
		private WP_Sync_Storage $injection_storage;

		/**
		 * Queued awareness entries to inject, keyed by room.
		 *
		 * @var array<string, array<int, array<string, mixed>>>
		 */
		private array $queued_injections = array();

		/**
		 * Ordered trace of the injected interleaving.
		 *
		 * @var array<int, array<string, mixed>>
		 */
		public array $trace = array();

		/**
		 * Constructor.
		 *
		 * @param WP_Sync_Storage $server_storage    Storage used by the sync server.
		 * @param WP_Sync_Storage $injection_storage Raw storage for injected completed writes.
		 */
		public function __construct( WP_Sync_Storage $server_storage, WP_Sync_Storage $injection_storage ) {
			$this->server_storage    = $server_storage;
			$this->injection_storage = $injection_storage;
		}

		/**
		 * Queues a completed awareness entry to inject.
		 *
		 * @param string               $room  Room identifier.
		 * @param array<string, mixed> $entry Stored awareness entry.
		 */
		public function queue_awareness_injection( string $room, array $entry ): void {
			$this->queued_injections[ $room ][] = $entry;
			$this->trace[]                      = array(
				'event'     => 'queued_concurrent_awareness_write',
				'client_id' => (int) $entry['client_id'],
				'room'      => $room,
			);
		}

		/**
		 * Adds a sync update to a given room.
		 *
		 * @param string $room   Room identifier.
		 * @param mixed  $update Serializable sync update.
		 * @return bool True on success, false on failure.
		 */
		public function add_update( string $room, $update ): bool {
			return $this->server_storage->add_update( $room, $update );
		}

		/**
		 * Gets awareness state and then injects the queued concurrent write.
		 *
		 * This models the older server path where request A has already read the
		 * room and request B completes before request A writes its stale merge.
		 *
		 * @param string $room Room identifier.
		 * @return array<int, mixed> Awareness state.
		 */
		public function get_awareness_state( string $room ): array {
			$snapshot      = $this->server_storage->get_awareness_state( $room );
			$this->trace[] = array(
				'event'      => 'stale_request_read_awareness',
				'client_ids' => $this->awareness_client_ids( $snapshot ),
				'room'       => $room,
			);

			$this->inject_awareness_entry( $room, 'after_stale_read' );
			return $snapshot;
		}

		/**
		 * Updates one client's awareness state.
		 *
		 * The fixed server calls this method instead of the older get/set pair.
		 * The injection still represents the same completed concurrent request,
		 * but it happens just before the atomic storage update reads latest state.
		 *
		 * @param string                    $room             Room identifier.
		 * @param int                       $client_id        Client identifier.
		 * @param array<string, mixed>|null $awareness_update Awareness state sent by the client.
		 * @param int                       $current_time     Current Unix timestamp.
		 * @param int                       $wp_user_id       WordPress user ID.
		 * @param int                       $timeout          Awareness timeout in seconds.
		 * @return array<int, array<string, mixed>> Map of client ID to awareness state.
		 */
		public function update_awareness_state( string $room, int $client_id, ?array $awareness_update, int $current_time, int $wp_user_id, int $timeout ): array {
			$this->trace[] = array(
				'event'     => 'stale_request_entered_atomic_update',
				'client_id' => $client_id,
				'room'      => $room,
			);
			$this->inject_awareness_entry( $room, 'before_atomic_update' );

			if ( method_exists( $this->server_storage, 'update_awareness_state' ) ) {
				return $this->server_storage->update_awareness_state( $room, $client_id, $awareness_update, $current_time, $wp_user_id, $timeout );
			}

			$this->trace[] = array(
				'event' => 'atomic_update_unavailable',
				'room'  => $room,
			);
			return array();
		}

		/**
		 * Gets the current cursor for a given room.
		 *
		 * @param string $room Room identifier.
		 * @return int Current cursor.
		 */
		public function get_cursor( string $room ): int {
			return $this->server_storage->get_cursor( $room );
		}

		/**
		 * Gets the total number of stored updates for a given room.
		 *
		 * @param string $room Room identifier.
		 * @return int Total number of updates.
		 */
		public function get_update_count( string $room ): int {
			return $this->server_storage->get_update_count( $room );
		}

		/**
		 * Retrieves sync updates from a room for a given cursor.
		 *
		 * @param string $room   Room identifier.
		 * @param int    $cursor Return updates after this cursor.
		 * @return array<int, mixed> Sync updates.
		 */
		public function get_updates_after_cursor( string $room, int $cursor ): array {
			return $this->server_storage->get_updates_after_cursor( $room, $cursor );
		}

		/**
		 * Removes updates from a room that are older than the provided cursor.
		 *
		 * @param string $room   Room identifier.
		 * @param int    $cursor Remove updates with markers < this cursor.
		 * @return bool True on success, false on failure.
		 */
		public function remove_updates_before_cursor( string $room, int $cursor ): bool {
			return $this->server_storage->remove_updates_before_cursor( $room, $cursor );
		}

		/**
		 * Sets awareness state for a given room.
		 *
		 * @param string            $room      Room identifier.
		 * @param array<int, mixed> $awareness Serializable awareness state.
		 * @return bool True on success, false on failure.
		 */
		public function set_awareness_state( string $room, array $awareness ): bool {
			$this->trace[] = array(
				'event'      => 'stale_request_write_awareness',
				'client_ids' => $this->awareness_client_ids( $awareness ),
				'room'       => $room,
			);

			return $this->server_storage->set_awareness_state( $room, $awareness );
		}

		/**
		 * Injects one queued completed awareness write for a room.
		 *
		 * @param string $room            Room identifier.
		 * @param string $injection_point Trace label for where the injection occurred.
		 */
		private function inject_awareness_entry( string $room, string $injection_point ): void {
			if ( empty( $this->queued_injections[ $room ] ) ) {
				return;
			}

			$entry = array_shift( $this->queued_injections[ $room ] );

			$by_client_id = array();
			foreach ( array_merge( $this->injection_storage->get_awareness_state( $room ), array( $entry ) ) as $awareness_entry ) {
				if ( ! is_array( $awareness_entry ) || ! isset( $awareness_entry['client_id'] ) ) {
					continue;
				}
				$by_client_id[ (int) $awareness_entry['client_id'] ] = $awareness_entry;
			}

			$this->injection_storage->set_awareness_state( $room, array_values( $by_client_id ) );
			$this->trace[] = array(
				'event'           => 'injected_concurrent_awareness_write',
				'injection_point' => $injection_point,
				'client_id'       => (int) $entry['client_id'],
				'room'            => $room,
			);
		}

		/**
		 * Returns awareness client IDs from stored entries.
		 *
		 * @param array<int, mixed> $awareness Awareness entries.
		 * @return array<int, int> Client IDs.
		 */
		private function awareness_client_ids( array $awareness ): array {
			$client_ids = array();
			foreach ( $awareness as $entry ) {
				if ( is_array( $entry ) && isset( $entry['client_id'] ) ) {
					$client_ids[] = (int) $entry['client_id'];
				}
			}

			return $client_ids;
		}
	};
}

/**
 * Converts stored awareness entries into a client-ID keyed map.
 *
 * @param array<int, mixed> $awareness Awareness entries.
 * @return array<int, array<string, mixed>> Awareness state keyed by client ID.
 */
function gutenberg_test_sync_awareness_lost_update_response_map( array $awareness ): array {
	$response = array();
	foreach ( $awareness as $entry ) {
		if ( ! is_array( $entry ) || ! isset( $entry['client_id'], $entry['state'] ) || ! is_array( $entry['state'] ) ) {
			continue;
		}
		$response[ (int) $entry['client_id'] ] = $entry['state'];
	}

	return $response;
}

/**
 * Returns awareness client IDs from stored entries.
 *
 * @param array<int, mixed> $awareness Awareness entries.
 * @return array<int, int> Client IDs.
 */
function gutenberg_test_sync_awareness_lost_update_client_ids( array $awareness ): array {
	$client_ids = array();
	foreach ( $awareness as $entry ) {
		if ( is_array( $entry ) && isset( $entry['client_id'] ) ) {
			$client_ids[] = (int) $entry['client_id'];
		}
	}

	return $client_ids;
}

/**
 * Merges awareness using the old vulnerable read-modify-write behavior.
 *
 * @param array<int, mixed>          $existing_awareness Existing awareness entries.
 * @param int                       $client_id          Client identifier.
 * @param array<string, mixed>|null $awareness_update   Awareness state sent by the client.
 * @param int                       $current_time       Current Unix timestamp.
 * @param int                       $wp_user_id         WordPress user ID.
 * @return array<int, array<string, mixed>> Updated awareness entries.
 */
function gutenberg_test_sync_awareness_lost_update_vulnerable_merge( array $existing_awareness, int $client_id, ?array $awareness_update, int $current_time, int $wp_user_id ): array {
	$updated_awareness = array();

	foreach ( $existing_awareness as $entry ) {
		if ( ! is_array( $entry ) || ! isset( $entry['client_id'], $entry['state'], $entry['updated_at'], $entry['wp_user_id'] ) ) {
			continue;
		}

		$entry_client_id = (int) $entry['client_id'];
		if ( $client_id === $entry_client_id ) {
			continue;
		}
		if ( $current_time - (int) $entry['updated_at'] >= WP_HTTP_Polling_Sync_Server::AWARENESS_TIMEOUT ) {
			continue;
		}

		$updated_awareness[] = array(
			'client_id'  => $entry_client_id,
			'state'      => is_array( $entry['state'] ) ? $entry['state'] : array(),
			'updated_at' => (int) $entry['updated_at'],
			'wp_user_id' => (int) $entry['wp_user_id'],
		);
	}

	if ( null !== $awareness_update ) {
		$updated_awareness[] = array(
			'client_id'  => $client_id,
			'state'      => $awareness_update,
			'updated_at' => $current_time,
			'wp_user_id' => $wp_user_id,
		);
	}

	return $updated_awareness;
}

/**
 * Runs the old vulnerable awareness read/write interleaving for video capture.
 *
 * @param string                    $room            Room identifier.
 * @param WP_Sync_Storage           $raw_storage     Storage backend.
 * @param array<string, mixed>      $completed_entry Completed concurrent awareness entry.
 * @param array<string, mixed>|null $stale_state     Stale request awareness state.
 * @param int                       $stale_client_id Stale request client identifier.
 * @param int                       $current_user_id Current WordPress user ID.
 * @return array<string, mixed> Race response data.
 */
function gutenberg_test_sync_awareness_lost_update_run_buggy_mode( string $room, WP_Sync_Storage $raw_storage, array $completed_entry, ?array $stale_state, int $stale_client_id, int $current_user_id ): array {
	$trace    = array();
	$snapshot = $raw_storage->get_awareness_state( $room );
	$trace[]  = array(
		'event'      => 'stale_request_read_awareness',
		'client_ids' => gutenberg_test_sync_awareness_lost_update_client_ids( $snapshot ),
		'room'       => $room,
	);

	$raw_storage->set_awareness_state( $room, array( $completed_entry ) );
	$trace[] = array(
		'event'           => 'injected_concurrent_awareness_write',
		'injection_point' => 'after_stale_read',
		'client_id'       => (int) $completed_entry['client_id'],
		'room'            => $room,
	);

	$merged_awareness = gutenberg_test_sync_awareness_lost_update_vulnerable_merge(
		$snapshot,
		$stale_client_id,
		$stale_state,
		time(),
		$current_user_id
	);
	$trace[]          = array(
		'event'      => 'stale_request_write_awareness',
		'client_ids' => gutenberg_test_sync_awareness_lost_update_client_ids( $merged_awareness ),
		'room'       => $room,
	);
	$raw_storage->set_awareness_state( $room, $merged_awareness );

	return array(
		'mode'              => 'buggy',
		'trace'             => $trace,
		'responseAwareness' => gutenberg_test_sync_awareness_lost_update_response_map( $merged_awareness ),
		'storedAwareness'   => gutenberg_test_sync_awareness_lost_update_response_map( $raw_storage->get_awareness_state( $room ) ),
	);
}

/**
 * Runs the deterministic awareness lost-update reproduction.
 *
 * @param WP_REST_Request $request REST request.
 * @return WP_REST_Response|WP_Error REST response.
 */
function gutenberg_test_sync_awareness_lost_update_run( WP_REST_Request $request ) {
	if ( ! gutenberg_test_sync_awareness_lost_update_load_classes() ) {
		return new WP_Error(
			'gutenberg_test_sync_classes_unavailable',
			'The collaboration sync classes are unavailable.',
			array( 'status' => 500 )
		);
	}

	$room                = (string) $request['room'];
	$mode                = isset( $request['mode'] ) ? (string) $request['mode'] : 'fixed';
	$raw_storage         = new WP_Sync_Post_Meta_Storage();
	$server_storage      = $raw_storage;
	$stale_client_id     = isset( $request['stale_client_id'] ) ? (int) $request['stale_client_id'] : 1;
	$completed_client_id = isset( $request['completed_client_id'] ) ? (int) $request['completed_client_id'] : 2;
	$completed_state     = is_array( $request['completed_awareness'] ?? null ) ? $request['completed_awareness'] : array(
		'cursor' => 'completed-client',
		'source' => 'injected-concurrent-request',
	);
	$stale_state         = is_array( $request['stale_awareness'] ?? null ) ? $request['stale_awareness'] : array(
		'cursor' => 'stale-client',
		'source' => 'browser-request',
	);
	$current_user_id     = get_current_user_id();
	$completed_entry     = array(
		'client_id'  => $completed_client_id,
		'state'      => $completed_state,
		'updated_at' => time(),
		'wp_user_id' => $current_user_id,
	);
	$room_request_data   = array(
		'after'     => 0,
		'awareness' => $stale_state,
		'client_id' => $stale_client_id,
		'room'      => $room,
		'updates'   => array(),
	);

	$raw_storage->set_awareness_state( $room, array() );

	if ( class_exists( 'Gutenberg_Sync_Awareness_Merging_Storage' ) ) {
		$server_storage = new Gutenberg_Sync_Awareness_Merging_Storage( $raw_storage );
	}

	$sync_request = new WP_REST_Request( 'POST', '/wp-sync/v1/updates' );
	$sync_request->set_body_params(
		array(
			'rooms' => array( $room_request_data ),
		)
	);

	$permission_server = new WP_HTTP_Polling_Sync_Server( $raw_storage );
	$permission        = $permission_server->check_permissions( $sync_request );
	if ( is_wp_error( $permission ) ) {
		return $permission;
	}

	$validation = $permission_server->validate_request( $sync_request );
	if ( is_wp_error( $validation ) ) {
		return $validation;
	}

	if ( 'buggy' === $mode ) {
		$buggy_data = gutenberg_test_sync_awareness_lost_update_run_buggy_mode(
			$room,
			$raw_storage,
			$completed_entry,
			$stale_state,
			$stale_client_id,
			$current_user_id
		);

		return rest_ensure_response(
			array_merge(
				array(
					'room'                => $room,
					'staleAwareness'      => $stale_state,
					'completedAwareness'  => $completed_state,
					'injectionAnnotation' => 'The video injects the storage effect of a second HTTP polling request after the stale request has read awareness and before it overwrites the room.',
					'practiceAnnotation'  => 'In production, two editor tabs can poll /wp-sync/v1/updates concurrently in separate PHP requests for the same room, so one request can complete its awareness write between another request read and write.',
				),
				$buggy_data
			)
		);
	}

	$race_storage = gutenberg_test_sync_awareness_lost_update_create_race_storage( $server_storage, $raw_storage );
	$race_storage->queue_awareness_injection( $room, $completed_entry );

	$sync_server = new WP_HTTP_Polling_Sync_Server( $race_storage );
	$response    = $sync_server->handle_request( $sync_request );
	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$response_data = $response->get_data();

	return rest_ensure_response(
		array(
			'room'                => $room,
			'trace'               => $race_storage->trace,
			'staleAwareness'      => $stale_state,
			'completedAwareness'  => $completed_state,
			'responseAwareness'   => $response_data['rooms'][0]['awareness'] ?? array(),
			'storedAwareness'     => gutenberg_test_sync_awareness_lost_update_response_map( $raw_storage->get_awareness_state( $room ) ),
			'injectionAnnotation' => 'The test injects the storage effect of a second HTTP polling request after the stale request has read awareness and before it would overwrite the room.',
			'practiceAnnotation'  => 'In production, two editor tabs can poll /wp-sync/v1/updates concurrently in separate PHP requests for the same room, so one request can complete its awareness write between another request read and write.',
		)
	);
}

/**
 * Registers the deterministic race reproduction route.
 */
function gutenberg_test_sync_awareness_lost_update_register_route(): void {
	register_rest_route(
		'gutenberg-test/v1',
		'/sync-awareness-lost-update',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'gutenberg_test_sync_awareness_lost_update_run',
			'permission_callback' => static function () {
				return current_user_can( 'edit_posts' );
			},
			'args'                => array(
				'room' => array(
					'required' => true,
					'type'     => 'string',
					'pattern'  => '^[^/]+/[^/:]+(?::\\S+)?$',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'gutenberg_test_sync_awareness_lost_update_register_route' );
