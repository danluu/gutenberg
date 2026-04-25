<?php
/**
 * Gutenberg_Sync_Awareness_Merging_Storage class
 *
 * @package gutenberg
 */

if ( ! class_exists( 'Gutenberg_Sync_Awareness_Merging_Storage' ) ) {

	/**
	 * Storage wrapper that preserves awareness writes completed after a stale read.
	 *
	 * WordPress Core may already provide the RTC server/storage classes before
	 * Gutenberg can load its compat copies. In that case, Core's server still
	 * performs awareness as get_awareness_state() followed by set_awareness_state().
	 * This wrapper makes that older server path race-safe by remembering the
	 * snapshot returned to the current request and preserving any later completed
	 * client entries when the request writes its merged awareness list.
	 */
	class Gutenberg_Sync_Awareness_Merging_Storage implements WP_Sync_Storage {
		/**
		 * Wrapped storage backend.
		 */
		private WP_Sync_Storage $storage;

		/**
		 * Last awareness snapshots returned by room in this request.
		 *
		 * @var array<string, array<int, mixed>>
		 */
		private array $last_awareness_reads = array();

		/**
		 * Constructor.
		 *
		 * @param WP_Sync_Storage $storage Wrapped storage backend.
		 */
		public function __construct( WP_Sync_Storage $storage ) {
			$this->storage = $storage;
		}

		/**
		 * Adds a sync update to a given room.
		 *
		 * @param string $room   Room identifier.
		 * @param mixed  $update Serializable sync update.
		 * @return bool True on success, false on failure.
		 */
		public function add_update( string $room, $update ): bool {
			return $this->storage->add_update( $room, $update );
		}

		/**
		 * Gets awareness state for a given room.
		 *
		 * @param string $room Room identifier.
		 * @return array<int, mixed> Awareness state.
		 */
		public function get_awareness_state( string $room ): array {
			$awareness                           = $this->storage->get_awareness_state( $room );
			$this->last_awareness_reads[ $room ] = $awareness;
			return $awareness;
		}

		/**
		 * Updates one client's awareness state for a given room.
		 *
		 * @param string                    $room             Room identifier.
		 * @param int                       $client_id        Client identifier.
		 * @param array<string, mixed>|null $awareness_update Awareness state sent by the client, or null to disconnect.
		 * @param int                       $current_time     Current Unix timestamp.
		 * @param int                       $wp_user_id       WordPress user ID for this client.
		 * @param int                       $timeout          Awareness timeout in seconds.
		 * @param callable|null             $merge_callback   Optional room-specific merge callback.
		 * @return array<int, array<string, mixed>> Map of client ID to awareness state.
		 */
		public function update_awareness_state( string $room, int $client_id, ?array $awareness_update, int $current_time, int $wp_user_id, int $timeout, ?callable $merge_callback = null ): array {
			if ( method_exists( $this->storage, 'update_awareness_state' ) ) {
				$method = new ReflectionMethod( $this->storage, 'update_awareness_state' );
				if ( 7 <= $method->getNumberOfParameters() ) {
					return $this->storage->update_awareness_state( $room, $client_id, $awareness_update, $current_time, $wp_user_id, $timeout, $merge_callback );
				}

				return $this->storage->update_awareness_state( $room, $client_id, $awareness_update, $current_time, $wp_user_id, $timeout );
			}

			$awareness = null === $merge_callback ? $this->merge_awareness_update(
				$this->get_awareness_state( $room ),
				$client_id,
				$awareness_update,
				$current_time,
				$wp_user_id,
				$timeout
			) : $merge_callback(
				$this->get_awareness_state( $room ),
				$client_id,
				$awareness_update,
				$current_time,
				$wp_user_id,
				$timeout
			);

			$this->set_awareness_state( $room, $awareness );

			return $this->awareness_entries_to_response( $awareness );
		}

		/**
		 * Gets the current cursor for a given room.
		 *
		 * @param string $room Room identifier.
		 * @return int Current cursor for the room.
		 */
		public function get_cursor( string $room ): int {
			return $this->storage->get_cursor( $room );
		}

		/**
		 * Gets the total number of stored updates for a given room.
		 *
		 * @param string $room Room identifier.
		 * @return int Total number of updates.
		 */
		public function get_update_count( string $room ): int {
			return $this->storage->get_update_count( $room );
		}

		/**
		 * Retrieves sync updates from a room for a given cursor.
		 *
		 * @param string $room   Room identifier.
		 * @param int    $cursor Return updates after this cursor.
		 * @return array<int, mixed> Sync updates.
		 */
		public function get_updates_after_cursor( string $room, int $cursor ): array {
			return $this->storage->get_updates_after_cursor( $room, $cursor );
		}

		/**
		 * Removes updates from a room that are older than the provided cursor.
		 *
		 * @param string $room   Room identifier.
		 * @param int    $cursor Remove updates with markers < this cursor.
		 * @return bool True on success, false on failure.
		 */
		public function remove_updates_before_cursor( string $room, int $cursor ): bool {
			return $this->storage->remove_updates_before_cursor( $room, $cursor );
		}

		/**
		 * Sets awareness state for a given room.
		 *
		 * @param string            $room      Room identifier.
		 * @param array<int, mixed> $awareness Serializable awareness state.
		 * @return bool True on success, false on failure.
		 */
		public function set_awareness_state( string $room, array $awareness ): bool {
			if ( ! isset( $this->last_awareness_reads[ $room ] ) ) {
				return $this->storage->set_awareness_state( $room, $awareness );
			}

			$read_awareness = $this->last_awareness_reads[ $room ];
			unset( $this->last_awareness_reads[ $room ] );

			$lock_name = $this->acquire_awareness_lock( $room );
			if ( null === $lock_name ) {
				return false;
			}

			try {
				$awareness = $this->preserve_entries_completed_after_read(
					$this->storage->get_awareness_state( $room ),
					$read_awareness,
					$awareness
				);

				return $this->storage->set_awareness_state( $room, $awareness );
			} finally {
				$this->release_awareness_lock( $lock_name );
			}
		}

		/**
		 * Acquires a per-room awareness lock.
		 *
		 * @param string $room Room identifier.
		 * @return string|null Lock name when acquired; null otherwise.
		 */
		private function acquire_awareness_lock( string $room ): ?string {
			global $wpdb;

			$lock_name     = 'wp_sync_awareness_' . md5( $room );
			$lock_acquired = '1' === (string) $wpdb->get_var(
				$wpdb->prepare( 'SELECT GET_LOCK( %s, %d )', $lock_name, 5 )
			);

			return $lock_acquired ? $lock_name : null;
		}

		/**
		 * Releases a per-room awareness lock.
		 *
		 * @param string $lock_name Lock name.
		 */
		private function release_awareness_lock( string $lock_name ): void {
			global $wpdb;

			$wpdb->get_var(
				$wpdb->prepare( 'SELECT RELEASE_LOCK( %s )', $lock_name )
			);
		}

		/**
		 * Preserves entries that completed after the stale read snapshot.
		 *
		 * @param array<int, mixed> $latest_awareness Latest stored awareness entries.
		 * @param array<int, mixed> $read_awareness   Awareness entries read before the stale merge.
		 * @param array<int, mixed> $next_awareness   Awareness entries the stale request is trying to write.
		 * @return array<int, mixed> Awareness entries with later completed states preserved.
		 */
		private function preserve_entries_completed_after_read( array $latest_awareness, array $read_awareness, array $next_awareness ): array {
			$read_by_client_id   = $this->awareness_entries_by_client_id( $read_awareness );
			$latest_by_client_id = $this->awareness_entries_by_client_id( $latest_awareness );
			$next_by_client_id   = $this->awareness_entries_by_client_id( $next_awareness );
			$current_timestamp   = time();

			foreach ( $next_by_client_id as $client_id => $entry ) {
				if (
					! isset( $read_by_client_id[ $client_id ] ) ||
					! $this->awareness_entries_match( $read_by_client_id[ $client_id ], $entry )
				) {
					continue;
				}

				if ( ! isset( $latest_by_client_id[ $client_id ] ) ) {
					unset( $next_by_client_id[ $client_id ] );
					continue;
				}

				if ( $this->is_awareness_entry_expired( $latest_by_client_id[ $client_id ], $current_timestamp, WP_HTTP_Polling_Sync_Server::AWARENESS_TIMEOUT ) ) {
					unset( $next_by_client_id[ $client_id ] );
					continue;
				}

				$next_by_client_id[ $client_id ] = $latest_by_client_id[ $client_id ];
			}

			foreach ( $latest_by_client_id as $client_id => $entry ) {
				if ( isset( $read_by_client_id[ $client_id ] ) || isset( $next_by_client_id[ $client_id ] ) ) {
					continue;
				}
				if ( $this->is_awareness_entry_expired( $entry, $current_timestamp, WP_HTTP_Polling_Sync_Server::AWARENESS_TIMEOUT ) ) {
					continue;
				}

				$next_by_client_id[ $client_id ] = $entry;
			}

			return array_values( $next_by_client_id );
		}

		/**
		 * Merges one client's awareness update into an existing awareness list.
		 *
		 * @param array<int, mixed>          $existing_awareness Existing awareness entries.
		 * @param int                       $client_id          Client identifier.
		 * @param array<string, mixed>|null $awareness_update   Awareness state sent by the client, or null to disconnect.
		 * @param int                       $current_time       Current Unix timestamp.
		 * @param int                       $wp_user_id         WordPress user ID for this client.
		 * @param int                       $timeout            Awareness timeout in seconds.
		 * @return array<int, array{client_id: int, state: array<string, mixed>, updated_at: int, wp_user_id: int}> Updated awareness entries.
		 */
		private function merge_awareness_update( array $existing_awareness, int $client_id, ?array $awareness_update, int $current_time, int $wp_user_id, int $timeout ): array {
			$updated_awareness = array();

			foreach ( $existing_awareness as $entry ) {
				if ( ! $this->is_awareness_entry( $entry ) ) {
					continue;
				}

				$entry_client_id = (int) $entry['client_id'];
				if ( $client_id === $entry_client_id ) {
					continue;
				}
				if ( $current_time - (int) $entry['updated_at'] >= $timeout ) {
					continue;
				}

				$updated_awareness[] = $this->normalize_awareness_entry( $entry );
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
		 * Converts awareness entries to a client-ID keyed map.
		 *
		 * @param array<int, mixed> $awareness Awareness entries.
		 * @return array<int, array{client_id: int, state: array<string, mixed>, updated_at: int, wp_user_id: int}> Entries keyed by client ID.
		 */
		private function awareness_entries_by_client_id( array $awareness ): array {
			$by_client_id = array();
			foreach ( $awareness as $entry ) {
				if ( $this->is_awareness_entry( $entry ) ) {
					$by_client_id[ (int) $entry['client_id'] ] = $this->normalize_awareness_entry( $entry );
				}
			}
			return $by_client_id;
		}

		/**
		 * Checks whether two awareness entries describe the same stored state.
		 *
		 * @param array<string, mixed> $left  First awareness entry.
		 * @param array<string, mixed> $right Second awareness entry.
		 * @return bool Whether the entries match.
		 */
		private function awareness_entries_match( array $left, array $right ): bool {
			return $this->normalize_awareness_entry( $left ) === $this->normalize_awareness_entry( $right );
		}

		/**
		 * Checks whether an awareness entry is expired.
		 *
		 * @param array<string, mixed> $entry             Awareness entry.
		 * @param int                  $current_timestamp Current Unix timestamp.
		 * @param int                  $timeout           Awareness timeout in seconds.
		 * @return bool Whether the entry has expired.
		 */
		private function is_awareness_entry_expired( array $entry, int $current_timestamp, int $timeout ): bool {
			return $current_timestamp - (int) $entry['updated_at'] >= $timeout;
		}

		/**
		 * Converts stored awareness entries to the REST response shape.
		 *
		 * @param array<int, array{client_id: int, state: array<string, mixed>}> $awareness Awareness entries.
		 * @return array<int, array<string, mixed>> Map of client ID to awareness state.
		 */
		private function awareness_entries_to_response( array $awareness ): array {
			$response = array();
			foreach ( $awareness as $entry ) {
				$response[ $entry['client_id'] ] = $entry['state'];
			}
			return $response;
		}

		/**
		 * Checks whether a value is an awareness entry.
		 *
		 * @param mixed $entry Potential awareness entry.
		 * @return bool Whether the value is an awareness entry.
		 */
		private function is_awareness_entry( $entry ): bool {
			return is_array( $entry ) && isset( $entry['client_id'], $entry['state'], $entry['updated_at'], $entry['wp_user_id'] );
		}

		/**
		 * Normalizes an awareness entry's scalar fields.
		 *
		 * @param array<string, mixed> $entry Awareness entry.
		 * @return array{client_id: int, state: array<string, mixed>, updated_at: int, wp_user_id: int} Normalized entry.
		 */
		private function normalize_awareness_entry( array $entry ): array {
			return array(
				'client_id'  => (int) $entry['client_id'],
				'state'      => is_array( $entry['state'] ) ? $entry['state'] : array(),
				'updated_at' => (int) $entry['updated_at'],
				'wp_user_id' => (int) $entry['wp_user_id'],
			);
		}
	}
}
