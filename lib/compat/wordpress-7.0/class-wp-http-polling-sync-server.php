<?php
/**
 * WP_HTTP_Polling_Sync_Server class
 *
 * @package gutenberg
 */

if ( ! class_exists( 'WP_HTTP_Polling_Sync_Server' ) ) {

	/**
	 * Core class that contains an HTTP server used for collaborative editing.
	 *
	 * @since 7.0.0
	 * @access private
	 */
	class WP_HTTP_Polling_Sync_Server {
		/**
		 * REST API namespace.
		 *
		 * @since 7.0.0
		 * @var string
		 */
		const REST_NAMESPACE = 'wp-sync/v1';

		/**
		 * Awareness timeout in seconds. Clients that haven't updated
		 * their awareness state within this time are considered disconnected.
		 *
		 * @since 7.0.0
		 * @var int
		 */
		const AWARENESS_TIMEOUT = 30;

		/**
		 * Threshold used to signal clients to send a compaction update.
		 *
		 * @since 7.0.0
		 * @var int
		 */
		const COMPACTION_THRESHOLD = 50;

		/**
		 * Maximum total size (in bytes) of the request body.
		 *
		 * @since 7.0.0
		 * @var int
		 */
		const MAX_BODY_SIZE = 16 * MB_IN_BYTES;

		/**
		 * Maximum number of rooms allowed per request.
		 *
		 * @since 7.0.0
		 * @var int
		 */
		const MAX_ROOMS_PER_REQUEST = 50;

		/**
		 * Maximum length of a single update data string.
		 *
		 * @since 7.0.0
		 * @var int
		 */
		const MAX_UPDATE_DATA_SIZE = MB_IN_BYTES;

		/**
		 * Sync update type: compaction.
		 *
		 * @since 7.0.0
		 * @var string
		 */
		const UPDATE_TYPE_COMPACTION = 'compaction';

		/**
		 * Sync update type: sync step 1.
		 *
		 * @since 7.0.0
		 * @var string
		 */
		const UPDATE_TYPE_SYNC_STEP1 = 'sync_step1';

		/**
		 * Sync update type: sync step 2.
		 *
		 * @since 7.0.0
		 * @var string
		 */
		const UPDATE_TYPE_SYNC_STEP2 = 'sync_step2';

		/**
		 * Sync update type: regular update.
		 *
		 * @since 7.0.0
		 * @var string
		 */
		const UPDATE_TYPE_UPDATE = 'update';

		/**
		 * Client-provided awareness fields accepted by the server.
		 *
		 * @since 7.0.0
		 * @var string[]
		 */
		const ALLOWED_AWARENESS_FIELDS = array(
			'collaboratorInfo',
			'editorState',
		);

		/**
		 * Storage backend for sync updates.
		 *
		 * @since 7.0.0
		 */
		private WP_Sync_Storage $storage;

		/**
		 * Constructor.
		 *
		 * @since 7.0.0
		 *
		 * @param WP_Sync_Storage $storage Storage backend for sync updates.
		 */
		public function __construct( WP_Sync_Storage $storage ) {
			$this->storage = $storage;
		}

		/**
		 * Registers REST API routes.
		 *
		 * @since 7.0.0
		 */
		public function register_routes(): void {
			$typed_update_args = array(
				'properties' => array(
					'data' => array(
						'type'      => 'string',
						'required'  => true,
						'maxLength' => self::MAX_UPDATE_DATA_SIZE,
					),
					'type' => array(
						'type'     => 'string',
						'required' => true,
						'enum'     => array(
							self::UPDATE_TYPE_COMPACTION,
							self::UPDATE_TYPE_SYNC_STEP1,
							self::UPDATE_TYPE_SYNC_STEP2,
							self::UPDATE_TYPE_UPDATE,
						),
					),
				),
				'required'   => true,
				'type'       => 'object',
			);

			$room_args = array(
				'after'     => array(
					'minimum'  => 0,
					'required' => true,
					'type'     => 'integer',
				),
				'awareness' => array(
					'required' => true,
					'type'     => array( 'object', 'null' ),
				),
				'client_id' => array(
					'minimum'  => 1,
					'required' => true,
					'type'     => 'integer',
				),
				'room'      => array(
					'required' => true,
					'type'     => 'string',
					'pattern'  => '^[^/]+/[^/:]+(?::\\S+)?$',
				),
				'updates'   => array(
					'items'    => $typed_update_args,
					'minItems' => 0,
					'required' => true,
					'type'     => 'array',
				),
			);

			register_rest_route(
				self::REST_NAMESPACE,
				'/updates',
				array(
					'methods'             => array( WP_REST_Server::CREATABLE ),
					'callback'            => array( $this, 'handle_request' ),
					'permission_callback' => array( $this, 'check_permissions' ),
					'validate_callback'   => array( $this, 'validate_request' ),
					'args'                => array(
						'rooms' => array(
							'items'    => array(
								'properties' => $room_args,
								'type'       => 'object',
							),
							'maxItems' => self::MAX_ROOMS_PER_REQUEST,
							'required' => true,
							'type'     => 'array',
						),
					),
				)
			);
		}

		/**
		 * Checks if the current user has permission to access a room.
		 *
		 * @since 7.0.0
		 *
		 * @param WP_REST_Request $request The REST request.
		 * @return bool|WP_Error True if user has permission, otherwise WP_Error with details.
		 */
		public function check_permissions( WP_REST_Request $request ) {
			// Minimum cap check. Is user logged in with a contributor role or higher?
			if ( ! current_user_can( 'edit_posts' ) ) {
				return new WP_Error(
					'rest_cannot_edit',
					__( 'You do not have permission to perform this action', 'gutenberg' ),
					array( 'status' => rest_authorization_required_code() )
				);
			}

			$rooms      = $request['rooms'];
			$wp_user_id = get_current_user_id();

			foreach ( $rooms as $room ) {
				$client_id = $room['client_id'];
				$room      = $room['room'];

				// Check that the client_id is not already owned by another user.
				$existing_awareness = $this->storage->get_awareness_state( $room );
				foreach ( $existing_awareness as $entry ) {
					if ( $client_id === $entry['client_id'] && $wp_user_id !== $entry['wp_user_id'] ) {
						return new WP_Error(
							'rest_cannot_edit',
							__( 'Client ID is already in use by another user.', 'gutenberg' ),
							array( 'status' => 403 )
						);
					}
				}

				$type_parts   = explode( '/', $room, 2 );
				$object_parts = explode( ':', $type_parts[1] ?? '', 2 );

				$entity_kind = $type_parts[0];
				$entity_name = $object_parts[0];
				$object_id   = $object_parts[1] ?? null;

				if ( ! $this->can_user_sync_entity_type( $entity_kind, $entity_name, $object_id ) ) {
					return new WP_Error(
						'rest_cannot_edit',
						sprintf(
							/* translators: %s: The room name encodes the current entity being synced. */
							__( 'You do not have permission to sync this entity: %s.', 'gutenberg' ),
							$room
						),
						array( 'status' => rest_authorization_required_code() )
					);
				}
			}

			return true;
		}

		/**
		 * Validates that the request body does not exceed the maximum allowed size.
		 *
		 * Runs as the route-level validate_callback, after per-arg schema
		 * validation has already passed.
		 *
		 * @since 7.0.0
		 *
		 * @param WP_REST_Request $request The REST request.
		 * @return true|WP_Error True if valid, WP_Error if the body is too large.
		 */
		public function validate_request( WP_REST_Request $request ) {
			$body = $request->get_body();
			if ( is_string( $body ) && strlen( $body ) > self::MAX_BODY_SIZE ) {
				return new WP_Error(
					'rest_sync_body_too_large',
					__( 'Request body is too large.', 'gutenberg' ),
					array( 'status' => 413 )
				);
			}

			foreach ( $request['rooms'] as $room ) {
				$result = $this->validate_awareness_update( $room['awareness'] );
				if ( is_wp_error( $result ) ) {
					return $result;
				}
			}

			return true;
		}

		/**
		 * Handles request: stores sync updates and awareness data, and returns
		 * updates the client is missing.
		 *
		 * @since 7.0.0
		 *
		 * @param WP_REST_Request $request The REST request.
		 * @return WP_REST_Response|WP_Error Response object or error.
		 */
		public function handle_request( WP_REST_Request $request ) {
			$rooms    = $request['rooms'];
			$response = array(
				'rooms' => array(),
			);

			foreach ( $rooms as $room_request ) {
				$awareness = $room_request['awareness'];
				$client_id = $room_request['client_id'];
				$cursor    = $room_request['after'];
				$room      = $room_request['room'];

				$validation_result = $this->validate_awareness_update( $awareness );
				if ( is_wp_error( $validation_result ) ) {
					return $validation_result;
				}

				// Merge awareness state.
				$merged_awareness = $this->process_awareness_update( $room, $client_id, $awareness );

				// The lowest client ID is nominated to perform compaction when needed.
				$is_compactor = false;
				if ( count( $merged_awareness ) > 0 ) {
					$is_compactor = min( array_keys( $merged_awareness ) ) === $client_id;
				}

				// Process each update according to its type.
				foreach ( $room_request['updates'] as $update ) {
					$result = $this->process_sync_update( $room, $client_id, $cursor, $update );
					if ( is_wp_error( $result ) ) {
						return $result;
					}
				}

				// Get updates for this client.
				$room_response              = $this->get_updates( $room, $client_id, $cursor, $is_compactor );
				$room_response['awareness'] = $merged_awareness;

				$response['rooms'][] = $room_response;
			}

			return new WP_REST_Response( $response, 200 );
		}

		/**
		 * Checks if the current user can sync a specific entity type.
		 *
		 * @since 7.0.0
		 *
		 * @param string      $entity_kind The entity kind, e.g. 'postType', 'taxonomy', 'root'.
		 * @param string      $entity_name The entity name, e.g. 'post', 'category', 'site'.
		 * @param string|null $object_id   The numeric object ID / entity key for single entities, null for collections.
		 * @return bool True if user has permission, otherwise false.
		 */
		private function can_user_sync_entity_type( string $entity_kind, string $entity_name, ?string $object_id ): bool {
			if ( is_string( $object_id ) ) {
				if ( ! ctype_digit( $object_id ) ) {
					return false;
				}
				$object_id = (int) $object_id;
			}
			if ( null !== $object_id && $object_id <= 0 ) {
				// Object ID must be numeric if provided.
				return false;
			}

			// Validate permissions for the provided object ID.
			if ( is_int( $object_id ) ) {
				// Handle single post type entities with a defined object ID.
				if ( 'postType' === $entity_kind ) {
					if ( get_post_type( $object_id ) !== $entity_name ) {
						// Post is not of the specified post type.
						return false;
					}
					return current_user_can( 'edit_post', $object_id );
				}

				// Handle single taxonomy term entities with a defined object ID.
				if ( 'taxonomy' === $entity_kind ) {
					$term_exists = term_exists( $object_id, $entity_name );
					if ( ! is_array( $term_exists ) || ! isset( $term_exists['term_id'] ) ) {
						// Either term doesn't exist OR term is not in specified taxonomy.
						return false;
					}

					return current_user_can( 'edit_term', $object_id );
				}

				// Handle single comment entities with a defined object ID.
				if ( 'root' === $entity_kind && 'comment' === $entity_name ) {
					return current_user_can( 'edit_comment', $object_id );
				}
			}

			// All the remaining checks are for collections. If an object ID is provided,
			// reject the request.
			if ( null !== $object_id ) {
				return false;
			}

			// For postType collections, check if the user can edit posts of this type.
			if ( 'postType' === $entity_kind ) {
				$post_type_object = get_post_type_object( $entity_name );
				if ( ! isset( $post_type_object->cap->edit_posts ) ) {
					return false;
				}

				return current_user_can( $post_type_object->cap->edit_posts );
			}

			// Collection syncing does not exchange entity data. It only signals if
			// another user has updated an entity in the collection. Therefore, we only
			// compare against an allow list of collection types.
			$allowed_collection_entity_kinds = array(
				'postType',
				'root',
				'taxonomy',
			);

			return in_array( $entity_kind, $allowed_collection_entity_kinds, true );
		}

		/**
		 * Checks whether an array came from a JSON object rather than a JSON list.
		 *
		 * @since 7.0.0
		 *
		 * @param array<mixed> $value The value to check.
		 * @return bool True for object-like arrays, false for list-like arrays.
		 */
		private function is_object_like_array( array $value ): bool {
			if ( array() === $value ) {
				return true;
			}

			foreach ( array_keys( $value ) as $key ) {
				if ( is_int( $key ) ) {
					return false;
				}
			}

			return true;
		}

		/**
		 * Validates client-provided awareness before it is stored or fanned out.
		 *
		 * @since 7.0.0
		 *
		 * @param mixed $awareness_update Awareness state sent by the client.
		 * @return true|WP_Error True when valid, otherwise an error.
		 */
		private function validate_awareness_update( $awareness_update ) {
			if ( null === $awareness_update ) {
				return true;
			}

			if ( ! is_array( $awareness_update ) || ! $this->is_object_like_array( $awareness_update ) ) {
				return new WP_Error(
					'rest_invalid_param',
					__( 'Invalid awareness state.', 'gutenberg' ),
					array( 'status' => 400 )
				);
			}

			foreach ( array_keys( $awareness_update ) as $field ) {
				if ( ! in_array( $field, self::ALLOWED_AWARENESS_FIELDS, true ) ) {
					return new WP_Error(
						'rest_invalid_param',
						__( 'Invalid awareness state.', 'gutenberg' ),
						array( 'status' => 400 )
					);
				}
			}

			if (
				isset( $awareness_update['collaboratorInfo'] ) &&
				( ! is_array( $awareness_update['collaboratorInfo'] ) || ! $this->is_object_like_array( $awareness_update['collaboratorInfo'] ) )
			) {
				return new WP_Error(
					'rest_invalid_param',
					__( 'Invalid awareness state.', 'gutenberg' ),
					array( 'status' => 400 )
				);
			}

			if (
				isset( $awareness_update['editorState'] ) &&
				( ! is_array( $awareness_update['editorState'] ) || ! $this->is_object_like_array( $awareness_update['editorState'] ) )
			) {
				return new WP_Error(
					'rest_invalid_param',
					__( 'Invalid awareness state.', 'gutenberg' ),
					array( 'status' => 400 )
				);
			}

			return true;
		}

		/**
		 * Gets the display name to use for collaborator presence.
		 *
		 * @since 7.0.0
		 *
		 * @param WP_User $user User object.
		 * @return string Display name.
		 */
		private function get_collaborator_display_name( WP_User $user ): string {
			if ( '' !== $user->display_name ) {
				return $user->display_name;
			}

			if ( '' !== $user->user_login ) {
				return $user->user_login;
			}

			return (string) $user->ID;
		}

		/**
		 * Gets the browser name from a user-agent string.
		 *
		 * @since 7.0.0
		 *
		 * @param string $user_agent The user-agent string.
		 * @return string Browser name.
		 */
		private function get_browser_name( string $user_agent ): string {
			if ( false !== strpos( $user_agent, 'Firefox' ) ) {
				return 'Firefox';
			}
			if ( false !== strpos( $user_agent, 'Edg' ) ) {
				return 'Microsoft Edge';
			}
			if ( false !== strpos( $user_agent, 'Chrome' ) && false === strpos( $user_agent, 'Edg' ) ) {
				return 'Chrome';
			}
			if ( false !== strpos( $user_agent, 'Safari' ) && false === strpos( $user_agent, 'Chrome' ) ) {
				return 'Safari';
			}
			if ( false !== strpos( $user_agent, 'MSIE' ) || false !== strpos( $user_agent, 'Trident' ) ) {
				return 'Internet Explorer';
			}
			if ( false !== strpos( $user_agent, 'Opera' ) || false !== strpos( $user_agent, 'OPR' ) ) {
				return 'Opera';
			}

			return 'Unknown';
		}

		/**
		 * Builds canonical collaborator identity from WordPress user data.
		 *
		 * @since 7.0.0
		 *
		 * @param int         $wp_user_id   User ID.
		 * @param int|null    $entered_at   Existing enteredAt timestamp in milliseconds.
		 * @param string|null $browser_type Existing browser type, or null for the current request.
		 * @return array{id: int, name: string, slug: string, avatar_urls: array<string, string>, browserType: string, enteredAt: int}|null Collaborator info or null when the user is missing.
		 */
		private function get_canonical_collaborator_info( int $wp_user_id, ?int $entered_at = null, ?string $browser_type = null ): ?array {
			$user = get_userdata( $wp_user_id );
			if ( ! $user instanceof WP_User ) {
				return null;
			}

			if ( null === $browser_type ) {
				$browser_type = $this->get_browser_name( $_SERVER['HTTP_USER_AGENT'] ?? '' );
			}

			$avatar_urls = rest_get_avatar_urls( $user );
			if ( ! is_array( $avatar_urls ) ) {
				$avatar_urls = array();
			}

			return array(
				'avatar_urls' => $avatar_urls,
				'browserType' => $browser_type,
				'enteredAt'   => $entered_at ?? time() * 1000,
				'id'          => $user->ID,
				'name'        => $this->get_collaborator_display_name( $user ),
				'slug'        => $user->user_nicename,
			);
		}

		/**
		 * Normalizes a valid client awareness update into the server-to-client shape.
		 *
		 * @since 7.0.0
		 *
		 * @param array<string, mixed> $awareness_update Client awareness state.
		 * @param int                  $wp_user_id        User ID.
		 * @param int|null             $entered_at        Existing enteredAt timestamp in milliseconds.
		 * @return array<string, mixed>|null Server awareness state, or null when the user is missing.
		 */
		private function normalize_awareness_update( array $awareness_update, int $wp_user_id, ?int $entered_at = null ): ?array {
			$collaborator_info = $this->get_canonical_collaborator_info( $wp_user_id, $entered_at );
			if ( null === $collaborator_info ) {
				return null;
			}

			$normalized = array(
				'collaboratorInfo' => $collaborator_info,
			);

			if ( isset( $awareness_update['editorState'] ) ) {
				$normalized['editorState'] = $awareness_update['editorState'];
			}

			return $normalized;
		}

		/**
		 * Normalizes a stored awareness entry and drops stale malformed state.
		 *
		 * @since 7.0.0
		 *
		 * @param array<string, mixed> $entry Stored awareness entry.
		 * @return array<string, mixed>|null Normalized storage entry or null when invalid.
		 */
		private function normalize_stored_awareness_entry( array $entry ): ?array {
			if (
				! isset( $entry['state'], $entry['wp_user_id'], $entry['updated_at'] ) ||
				! is_array( $entry['state'] ) ||
				true !== $this->validate_awareness_update( $entry['state'] )
			) {
				return null;
			}

			$entered_at = null;
			if ( isset( $entry['state']['collaboratorInfo']['enteredAt'] ) && is_numeric( $entry['state']['collaboratorInfo']['enteredAt'] ) ) {
				$entered_at = (int) $entry['state']['collaboratorInfo']['enteredAt'];
			} elseif ( is_numeric( $entry['updated_at'] ) ) {
				$entered_at = (int) $entry['updated_at'] * 1000;
			}

			$browser_type = null;
			if ( isset( $entry['state']['collaboratorInfo']['browserType'] ) && is_string( $entry['state']['collaboratorInfo']['browserType'] ) ) {
				$browser_type = $entry['state']['collaboratorInfo']['browserType'];
			}

			$collaborator_info = $this->get_canonical_collaborator_info( (int) $entry['wp_user_id'], $entered_at, $browser_type );
			if ( null === $collaborator_info ) {
				return null;
			}

			$state = array(
				'collaboratorInfo' => $collaborator_info,
			);

			if ( isset( $entry['state']['editorState'] ) ) {
				$state['editorState'] = $entry['state']['editorState'];
			}

			$entry['state'] = $state;
			return $entry;
		}

		/**
		 * Processes and stores an awareness update from a client.
		 *
		 * @since 7.0.0
		 *
		 * @param string                    $room             Room identifier.
		 * @param int                       $client_id        Client identifier.
		 * @param array<string, mixed>|null $awareness_update Awareness state sent by the client.
		 * @return array<int, array<string, mixed>> Map of client ID to awareness state.
		 */
		private function process_awareness_update( string $room, int $client_id, ?array $awareness_update ): array {
			$current_time = time();
			$wp_user_id   = get_current_user_id();

			if ( method_exists( $this->storage, 'update_awareness_state' ) ) {
				$method = new ReflectionMethod( $this->storage, 'update_awareness_state' );
				if ( 7 <= $method->getNumberOfParameters() ) {
					return $this->storage->update_awareness_state(
						$room,
						$client_id,
						$awareness_update,
						$current_time,
						$wp_user_id,
						self::AWARENESS_TIMEOUT,
						function ( array $existing_awareness, int $merge_client_id, ?array $merge_awareness_update, int $merge_current_time, int $merge_wp_user_id, int $merge_timeout ): array {
							return $this->merge_awareness_update(
								$existing_awareness,
								$merge_client_id,
								$merge_awareness_update,
								$merge_current_time,
								$merge_wp_user_id,
								$merge_timeout
							);
						}
					);
				}
			}

			$updated_awareness = $this->merge_awareness_update(
				$this->storage->get_awareness_state( $room ),
				$client_id,
				$awareness_update,
				$current_time,
				$wp_user_id,
				self::AWARENESS_TIMEOUT
			);

			// This action can fail, but it shouldn't fail the entire request.
			$this->storage->set_awareness_state( $room, $updated_awareness );

			return $this->awareness_entries_to_response( $updated_awareness );
		}

		/**
		 * Merges one client's awareness update into an existing awareness list.
		 *
		 * @since 7.0.0
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
			$updated_awareness   = array();
			$previous_entered_at = null;

			foreach ( $existing_awareness as $entry ) {
				if ( ! $this->is_awareness_entry( $entry ) ) {
					continue;
				}

				$entry = $this->normalize_stored_awareness_entry( $entry );
				if ( null === $entry ) {
					continue;
				}

				$entry_client_id = (int) $entry['client_id'];
				if ( $client_id === $entry_client_id ) {
					$previous_entered_at = $entry['state']['collaboratorInfo']['enteredAt'];
					continue;
				}
				if ( $current_time - (int) $entry['updated_at'] >= $timeout ) {
					continue;
				}

				$updated_awareness[] = $entry;
			}

			if ( null !== $awareness_update ) {
				$state = $this->normalize_awareness_update(
					$awareness_update,
					$wp_user_id,
					$previous_entered_at
				);

				if ( null !== $state ) {
					$updated_awareness[] = array(
						'client_id'  => $client_id,
						'state'      => $state,
						'updated_at' => $current_time,
						'wp_user_id' => $wp_user_id,
					);
				}
			}

			return $updated_awareness;
		}

		/**
		 * Converts stored awareness entries to the REST response shape.
		 *
		 * @since 7.0.0
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
		 * @since 7.0.0
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
		 * @since 7.0.0
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

		/**
		 * Processes a sync update based on its type.
		 *
		 * @since 7.0.0
		 *
		 * @param string                            $room      Room identifier.
		 * @param int                               $client_id Client identifier.
		 * @param int                               $cursor    Client cursor (marker of last seen update).
		 * @param array{data: string, type: string} $update    Sync update.
		 * @return true|WP_Error True on success, WP_Error on storage failure.
		 */
		private function process_sync_update( string $room, int $client_id, int $cursor, array $update ) {
			$data = $update['data'];
			$type = $update['type'];

			switch ( $type ) {
				case self::UPDATE_TYPE_COMPACTION:
					/*
					 * Compaction replaces updates the client has already seen. Only remove
					 * updates with markers before the client's cursor to preserve updates
					 * that arrived since the client's last sync.
					 *
					 * Check for a newer compaction update first. If one exists, skip this
					 * compaction to avoid overwriting it.
					 */
					$updates_after_cursor = $this->storage->get_updates_after_cursor( $room, $cursor );
					$has_newer_compaction = false;

					foreach ( $updates_after_cursor as $existing ) {
						if ( self::UPDATE_TYPE_COMPACTION === $existing['type'] ) {
							$has_newer_compaction = true;
							break;
						}
					}

					if ( ! $has_newer_compaction ) {
						if ( ! $this->storage->remove_updates_before_cursor( $room, $cursor ) ) {
							return new WP_Error(
								'rest_sync_storage_error',
								__( 'Failed to remove updates during compaction.', 'gutenberg' ),
								array( 'status' => 500 )
							);
						}

						return $this->add_update( $room, $client_id, $type, $data );
					}

					// Reaching this point means there's a newer compaction, so we can
					// silently ignore this one.
					return true;

				case self::UPDATE_TYPE_SYNC_STEP1:
				case self::UPDATE_TYPE_SYNC_STEP2:
				case self::UPDATE_TYPE_UPDATE:
					/*
					 * Sync step 1 announces a client's state vector. Other clients need
					 * to see it so they can respond with sync_step2 containing missing
					 * updates. The cursor-based filtering prevents re-delivery.
					 *
					 * Sync step 2 contains updates for a specific client.
					 *
					 * All updates are stored persistently.
					 */
					return $this->add_update( $room, $client_id, $type, $data );
			}

			return new WP_Error(
				'rest_invalid_update_type',
				__( 'Invalid sync update type.', 'gutenberg' ),
				array( 'status' => 400 )
			);
		}

		/**
		 * Adds an update to a room's update list via storage.
		 *
		 * @since 7.0.0
		 *
		 * @param string $room      Room identifier.
		 * @param int    $client_id Client identifier.
		 * @param string $type      Update type (sync_step1, sync_step2, update, compaction).
		 * @param string $data      Base64-encoded update data.
		 * @return true|WP_Error True on success, WP_Error on storage failure.
		 */
		private function add_update( string $room, int $client_id, string $type, string $data ) {
			$update = array(
				'client_id' => $client_id,
				'data'      => $data,
				'type'      => $type,
			);

			if ( ! $this->storage->add_update( $room, $update ) ) {
				return new WP_Error(
					'rest_sync_storage_error',
					__( 'Failed to store sync update.', 'gutenberg' ),
					array( 'status' => 500 )
				);
			}

			return true;
		}

		/**
		 * Gets sync updates for a specific client from a room after a given cursor.
		 *
		 * Delegates cursor-based retrieval to the storage layer, then applies
		 * client-specific filtering and compaction logic.
		 *
		 * @since 7.0.0
		 *
		 * @param string $room         Room identifier.
		 * @param int    $client_id    Client identifier.
		 * @param int    $cursor       Return updates after this cursor.
		 * @param bool   $is_compactor True if this client is nominated to perform compaction.
		 * @return array{
		 *   end_cursor: int,
		 *   should_compact: bool,
		 *   room: string,
		 *   total_updates: int,
		 *   updates: array<int, array{data: string, type: string}>,
		 * } Response data for this room.
		 */
		private function get_updates( string $room, int $client_id, int $cursor, bool $is_compactor ): array {
			$updates_after_cursor = $this->storage->get_updates_after_cursor( $room, $cursor );
			$total_updates        = $this->storage->get_update_count( $room );

			// Filter out this client's updates, except compaction updates.
			$typed_updates = array();
			foreach ( $updates_after_cursor as $update ) {
				if ( $client_id === $update['client_id'] && self::UPDATE_TYPE_COMPACTION !== $update['type'] ) {
					continue;
				}

				$typed_updates[] = array(
					'data' => $update['data'],
					'type' => $update['type'],
				);
			}

			$should_compact = $is_compactor && $total_updates > self::COMPACTION_THRESHOLD;

			return array(
				'end_cursor'     => $this->storage->get_cursor( $room ),
				'room'           => $room,
				'should_compact' => $should_compact,
				'total_updates'  => $total_updates,
				'updates'        => $typed_updates,
			);
		}
	}
}
