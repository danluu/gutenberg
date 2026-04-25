<?php
/**
 * Standalone model repro for the RTC awareness lost-update race.
 *
 * Run from the repository root:
 *
 *     php docs/explanations/fuzzer-bugs/repros/awareness-lost-update-model.php
 *
 * This does not load WordPress. It models only the old awareness
 * read-modify-write sequence from WP_HTTP_Polling_Sync_Server.
 *
 * @package gutenberg
 */

const GUTENBERG_REPRO_AWARENESS_TIMEOUT = 30;

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
function gutenberg_repro_awareness_lost_update_merge(
	array $existing_awareness,
	int $client_id,
	?array $awareness_update,
	int $current_time,
	int $wp_user_id
): array {
	$updated_awareness = array();

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

		if ( $current_time - (int) $entry['updated_at'] >= GUTENBERG_REPRO_AWARENESS_TIMEOUT ) {
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
function gutenberg_repro_awareness_lost_update_response_map( array $awareness ): array {
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
function gutenberg_repro_awareness_lost_update_client_ids( array $awareness ): array {
	$client_ids = array();
	foreach ( $awareness as $entry ) {
		if ( is_array( $entry ) && isset( $entry['client_id'] ) ) {
			$client_ids[] = (int) $entry['client_id'];
		}
	}

	return $client_ids;
}

$current_time    = 1700000000;
$wp_user_id      = 100;
$stale_client_id = 1;
$stale_state     = array(
	'cursor' => 'stale-client',
	'source' => 'stale-request',
);
$completed_entry = array(
	'client_id'  => 2,
	'state'      => array(
		'cursor' => 'completed-client',
		'source' => 'completed-concurrent-request',
	),
	'updated_at' => $current_time,
	'wp_user_id' => $wp_user_id,
);
$room_awareness  = array();
$stale_snapshot  = $room_awareness;
$trace           = array(
	array(
		'event'      => 'request_a_reads_awareness',
		'client_ids' => gutenberg_repro_awareness_lost_update_client_ids( $stale_snapshot ),
	),
);

$room_awareness = array( $completed_entry );
$trace[]        = array(
	'event'           => 'request_b_completes_awareness_write',
	'injection_point' => 'after_request_a_read_before_request_a_write',
	'client_ids'      => gutenberg_repro_awareness_lost_update_client_ids( $room_awareness ),
);

$stale_merge    = gutenberg_repro_awareness_lost_update_merge(
	$stale_snapshot,
	$stale_client_id,
	$stale_state,
	$current_time,
	$wp_user_id
);
$room_awareness = $stale_merge;
$trace[]        = array(
	'event'      => 'request_a_writes_merge_from_stale_snapshot',
	'client_ids' => gutenberg_repro_awareness_lost_update_client_ids( $room_awareness ),
);

$buggy_final = gutenberg_repro_awareness_lost_update_response_map( $room_awareness );

$atomic_merge = gutenberg_repro_awareness_lost_update_merge(
	array( $completed_entry ),
	$stale_client_id,
	$stale_state,
	$current_time,
	$wp_user_id
);
$fixed_final  = gutenberg_repro_awareness_lost_update_response_map( $atomic_merge );

$bug_reproduced = ! isset( $buggy_final[2] );
$result         = array(
	'name'                  => 'RTC awareness lost-update model repro',
	'layer'                 => 'standalone PHP model, no WordPress bootstrap',
	'bug_reproduced'        => $bug_reproduced,
	'injection_annotation'  => 'The script injects request B completing its awareness write after request A reads the room and before request A writes its stale merge.',
	'practice_annotation'   => 'The same interleaving can happen when two editor tabs poll /wp-sync/v1/updates concurrently for the same room in separate PHP requests.',
	'trace'                 => $trace,
	'buggy_final_awareness' => $buggy_final,
	'atomic_merge_expected' => $fixed_final,
);

echo json_encode( $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n";

if ( ! $bug_reproduced ) {
	fwrite( STDERR, "Expected the completed client state to be lost.\n" );
	exit( 1 );
}
