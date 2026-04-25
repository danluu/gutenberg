<?php
/**
 * Storage-level repro for the RTC awareness lost-update race.
 *
 * Run inside wp-env with WP-CLI from the repository root:
 *
 *     npm run wp-env-test -- run --env-cwd='wp-content/plugins/gutenberg' \
 *       cli wp eval-file \
 *       docs/explanations/fuzzer-bugs/repros/awareness-lost-update-storage.php
 *
 * This uses the real WP_Sync_Post_Meta_Storage backend but bypasses the
 * browser, Playwright, REST routing, permissions, and CRDT update handling.
 *
 * @package gutenberg
 */

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Run this file through WP-CLI, for example: wp eval-file docs/explanations/fuzzer-bugs/repros/awareness-lost-update-storage.php\n" );
	exit( 1 );
}

$collaboration_file           = dirname( __DIR__, 4 ) . '/lib/compat/wordpress-7.0/collaboration.php';
$collaboration_classes_loaded = class_exists( 'WP_Sync_Post_Meta_Storage' ) && class_exists( 'Gutenberg_Sync_Awareness_Merging_Storage' );
if (
	! $collaboration_classes_loaded &&
	! function_exists( 'gutenberg_inject_real_time_collaboration_setting' ) &&
	file_exists( $collaboration_file )
) {
	require_once $collaboration_file;
}

if ( ! class_exists( 'WP_Sync_Post_Meta_Storage' ) ) {
	fwrite( STDERR, "WP_Sync_Post_Meta_Storage is unavailable. Activate the Gutenberg plugin or load the collaboration classes first.\n" );
	exit( 1 );
}

if ( function_exists( 'gutenberg_register_sync_storage_post_type' ) && ! post_type_exists( 'wp_sync_storage' ) ) {
	gutenberg_register_sync_storage_post_type();
}

/**
 * Merges one awareness update using the old vulnerable server behavior.
 *
 * @param array<int, mixed>          $existing_awareness Existing awareness entries.
 * @param int                       $client_id          Client identifier.
 * @param array<string, mixed>|null $awareness_update   Client awareness state.
 * @param int                       $current_time       Current timestamp.
 * @param int                       $wp_user_id         WordPress user ID.
 * @return array<int, array<string, mixed>> Merged awareness list.
 */
function gutenberg_repro_awareness_storage_merge(
	array $existing_awareness,
	int $client_id,
	?array $awareness_update,
	int $current_time,
	int $wp_user_id
): array {
	$updated_awareness = array();
	$timeout           = class_exists( 'WP_HTTP_Polling_Sync_Server' ) ? WP_HTTP_Polling_Sync_Server::AWARENESS_TIMEOUT : 30;

	foreach ( $existing_awareness as $entry ) {
		if (
			! is_array( $entry ) ||
			! isset( $entry['client_id'], $entry['state'], $entry['updated_at'], $entry['wp_user_id'] )
		) {
			continue;
		}

		$entry_client_id = (int) $entry['client_id'];
		if ( $client_id === $entry_client_id ) {
			continue;
		}

		if ( $current_time - (int) $entry['updated_at'] >= $timeout ) {
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
 * Converts stored awareness entries to a client-ID keyed response map.
 *
 * @param array<int, mixed> $awareness Stored awareness entries.
 * @return array<int, array<string, mixed>> Awareness state keyed by client ID.
 */
function gutenberg_repro_awareness_storage_response_map( array $awareness ): array {
	$response = array();
	foreach ( $awareness as $entry ) {
		if ( is_array( $entry ) && isset( $entry['client_id'], $entry['state'] ) && is_array( $entry['state'] ) ) {
			$response[ (int) $entry['client_id'] ] = $entry['state'];
		}
	}

	return $response;
}

/**
 * Returns awareness client IDs from stored entries.
 *
 * @param array<int, mixed> $awareness Stored awareness entries.
 * @return array<int, int> Client IDs.
 */
function gutenberg_repro_awareness_storage_client_ids( array $awareness ): array {
	$client_ids = array();
	foreach ( $awareness as $entry ) {
		if ( is_array( $entry ) && isset( $entry['client_id'] ) ) {
			$client_ids[] = (int) $entry['client_id'];
		}
	}

	return $client_ids;
}

/**
 * Deletes the storage post for a repro room.
 *
 * @param string $room Room identifier.
 */
function gutenberg_repro_awareness_storage_delete_room( string $room ): void {
	$post_ids = get_posts(
		array(
			'post_type'      => 'wp_sync_storage',
			'posts_per_page' => -1,
			'post_status'    => 'any',
			'name'           => md5( $room ),
			'fields'         => 'ids',
		)
	);

	foreach ( $post_ids as $post_id ) {
		wp_delete_post( (int) $post_id, true );
	}
}

$storage      = new WP_Sync_Post_Meta_Storage();
$current_time = time();
$wp_user_id   = get_current_user_id();
if ( ! $wp_user_id ) {
	$wp_user_id = 1;
}
$stale_client_id     = 1;
$completed_client_id = 2;
$room                = 'postType/post:1:awareness-storage-repro-' . wp_generate_uuid4();
$fixed_room          = $room . '-fixed';
$stale_state         = array(
	'cursor' => 'stale-client',
	'source' => 'stale-request',
);
$completed_entry     = array(
	'client_id'  => $completed_client_id,
	'state'      => array(
		'cursor' => 'completed-client',
		'source' => 'completed-concurrent-request',
	),
	'updated_at' => $current_time,
	'wp_user_id' => $wp_user_id,
);
$result              = array();

try {
	$storage->set_awareness_state( $room, array() );

	$stale_snapshot = $storage->get_awareness_state( $room );
	$trace          = array(
		array(
			'event'      => 'request_a_reads_real_storage',
			'client_ids' => gutenberg_repro_awareness_storage_client_ids( $stale_snapshot ),
		),
	);

	$storage->set_awareness_state( $room, array( $completed_entry ) );
	$trace[] = array(
		'event'           => 'request_b_completes_real_storage_write',
		'injection_point' => 'after_request_a_read_before_request_a_write',
		'client_ids'      => gutenberg_repro_awareness_storage_client_ids( $storage->get_awareness_state( $room ) ),
	);

	$stale_merge = gutenberg_repro_awareness_storage_merge(
		$stale_snapshot,
		$stale_client_id,
		$stale_state,
		$current_time,
		$wp_user_id
	);
	$storage->set_awareness_state( $room, $stale_merge );
	$trace[] = array(
		'event'      => 'request_a_writes_stale_merge_to_real_storage',
		'client_ids' => gutenberg_repro_awareness_storage_client_ids( $storage->get_awareness_state( $room ) ),
	);

	$buggy_final = gutenberg_repro_awareness_storage_response_map( $storage->get_awareness_state( $room ) );
	$fixed_path  = 'unavailable';
	$fixed_final = null;

	if ( method_exists( $storage, 'update_awareness_state' ) ) {
		$fixed_path = 'WP_Sync_Post_Meta_Storage::update_awareness_state';
		$storage->set_awareness_state( $fixed_room, array( $completed_entry ) );
		$timeout = class_exists( 'WP_HTTP_Polling_Sync_Server' ) ? WP_HTTP_Polling_Sync_Server::AWARENESS_TIMEOUT : 30;
		$storage->update_awareness_state(
			$fixed_room,
			$stale_client_id,
			$stale_state,
			$current_time,
			$wp_user_id,
			$timeout
		);
		$fixed_final = gutenberg_repro_awareness_storage_response_map( $storage->get_awareness_state( $fixed_room ) );
	} elseif ( class_exists( 'Gutenberg_Sync_Awareness_Merging_Storage' ) ) {
		$fixed_path      = 'Gutenberg_Sync_Awareness_Merging_Storage';
		$wrapped_storage = new Gutenberg_Sync_Awareness_Merging_Storage( $storage );

		$storage->set_awareness_state( $fixed_room, array() );

		// Simulate the older server path reading before the completed request.
		$wrapped_storage->get_awareness_state( $fixed_room );

		$storage->set_awareness_state( $fixed_room, array( $completed_entry ) );
		$wrapped_storage->set_awareness_state(
			$fixed_room,
			array(
				array(
					'client_id'  => $stale_client_id,
					'state'      => $stale_state,
					'updated_at' => $current_time,
					'wp_user_id' => $wp_user_id,
				),
			)
		);
		$fixed_final = gutenberg_repro_awareness_storage_response_map( $storage->get_awareness_state( $fixed_room ) );
	}

	$result = array(
		'name'                  => 'RTC awareness lost-update storage repro',
		'layer'                 => 'WP-CLI script using WP_Sync_Post_Meta_Storage directly',
		'bug_reproduced'        => ! isset( $buggy_final[ $completed_client_id ] ),
		'fixed_path'            => $fixed_path,
		'fixed_path_preserved'  => is_array( $fixed_final ) && isset( $fixed_final[ $completed_client_id ] ),
		'injection_annotation'  => 'The script injects request B by writing through real post-meta storage after request A reads and before request A writes its stale merge.',
		'practice_annotation'   => 'This is the same storage boundary reached by concurrent /wp-sync/v1/updates requests for the same editor room.',
		'room'                  => $room,
		'trace'                 => $trace,
		'buggy_final_awareness' => $buggy_final,
		'fixed_final_awareness' => $fixed_final,
	);
} finally {
	gutenberg_repro_awareness_storage_delete_room( $room );
	gutenberg_repro_awareness_storage_delete_room( $fixed_room );
}

echo wp_json_encode( $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n";

if ( empty( $result['bug_reproduced'] ) ) {
	fwrite( STDERR, "Expected the completed client state to be lost by the stale write.\n" );
	exit( 1 );
}
