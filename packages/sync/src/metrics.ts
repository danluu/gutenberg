/**
 * WordPress dependencies
 */
import { doAction } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { ConnectionErrorCode } from './errors';
import type { ConnectionStatus, OnStatusChangeCallback } from './types';

export const SYNC_METRIC_EVENT_ACTION = 'sync.metricEvent';
export const SYNC_METRIC_SCHEMA_VERSION = 1;

type SyncMetricProperties = Record< string, unknown >;

type SummaryReason = 'pagehide' | 'unload_all';

export function recordSyncMetricEvent(
	eventName: string,
	properties: SyncMetricProperties = {}
): void {
	doAction( SYNC_METRIC_EVENT_ACTION, eventName, {
		schema_version: SYNC_METRIC_SCHEMA_VERSION,
		...properties,
	} );
}

export function normalizeConnectionErrorCode(
	code?: ConnectionErrorCode | string
): string {
	switch ( code ) {
		case ConnectionErrorCode.AUTHENTICATION_FAILED:
			return 'authentication_failed';
		case ConnectionErrorCode.CONNECTION_EXPIRED:
			return 'connection_expired';
		case ConnectionErrorCode.CONNECTION_LIMIT_EXCEEDED:
			return 'connection_limit_exceeded';
		case ConnectionErrorCode.DOCUMENT_SIZE_LIMIT_EXCEEDED:
			return 'document_size_limit_exceeded';
		case ConnectionErrorCode.PROTOCOL_MISMATCH:
			return 'protocol_mismatch';
		case ConnectionErrorCode.UNKNOWN_ERROR:
			return 'unknown_error';
		default:
			return 'unknown_error';
	}
}

export function getCountBucket( count: number | undefined ): string {
	if ( count === undefined || count < 0 ) {
		return 'unknown';
	}
	if ( count === 0 ) {
		return '0';
	}
	if ( count === 1 ) {
		return '1';
	}
	if ( count === 2 ) {
		return '2';
	}
	if ( count <= 4 ) {
		return '3_4';
	}
	if ( count <= 9 ) {
		return '5_9';
	}
	return '10_plus';
}

export function getDurationBucket( durationInMs: number | undefined ): string {
	if ( durationInMs === undefined || durationInMs < 0 ) {
		return 'unknown';
	}
	if ( durationInMs < 2000 ) {
		return 'lt_2s';
	}
	if ( durationInMs < 10000 ) {
		return '2_10s';
	}
	if ( durationInMs < 30000 ) {
		return '10_30s';
	}
	if ( durationInMs < 60000 ) {
		return '30_60s';
	}
	if ( durationInMs < 300000 ) {
		return '1_5m';
	}
	if ( durationInMs < 1800000 ) {
		return '5_30m';
	}
	return '30m_plus';
}

export function getByteSizeBucket( sizeInBytes: number | undefined ): string {
	if ( sizeInBytes === undefined || sizeInBytes < 0 ) {
		return 'unknown';
	}
	if ( sizeInBytes < 1024 ) {
		return 'lt_1kb';
	}
	if ( sizeInBytes < 10240 ) {
		return '1_10kb';
	}
	if ( sizeInBytes < 102400 ) {
		return '10_100kb';
	}
	if ( sizeInBytes < 1048576 ) {
		return '100kb_1mb';
	}
	return '1mb_plus';
}

function getVisibilityState(): string {
	if ( typeof document === 'undefined' ) {
		return 'unknown';
	}

	return document.visibilityState || 'unknown';
}

function getNetworkState(): string {
	if ( typeof navigator === 'undefined' ) {
		return 'unknown';
	}

	return navigator.onLine ? 'online' : 'offline';
}

function getStatusProperties( status: ConnectionStatus ) {
	if ( status.status !== 'disconnected' ) {
		return {};
	}

	return {
		connection_error_code: normalizeConnectionErrorCode(
			status.error?.code
		),
		can_manually_retry: status.canManuallyRetry === true,
		background_retries_failed: status.backgroundRetriesFailed === true,
		consecutive_failures_bucket: getCountBucket(
			status.consecutiveFailures
		),
		will_auto_retry_bucket: getDurationBucket( status.willAutoRetryInMs ),
		visibility_state: getVisibilityState(),
		network_state: getNetworkState(),
	};
}

export function createSyncMetricsSession() {
	let hasStarted = false;
	let hasConnected = false;
	let startedAt = 0;
	let activeProblemStartedAt: number | null = null;
	let connectionProblemCount = 0;
	let connectionRecoveryCount = 0;
	let localEditActivityCount = 0;
	let remoteEditActivityCount = 0;
	let endedStatus = 'unknown';
	let pageHideListenerRegistered = false;
	let suppressedStatusMetrics = 0;

	function ensureStarted( properties: SyncMetricProperties = {} ): void {
		if ( hasStarted ) {
			return;
		}

		hasStarted = true;
		startedAt = Date.now();

		recordSyncMetricEvent( 'rtc_session_started', properties );

		if ( typeof window !== 'undefined' && ! pageHideListenerRegistered ) {
			window.addEventListener( 'pagehide', handlePageHide );
			pageHideListenerRegistered = true;
		}
	}

	function handlePageHide(): void {
		recordSummary( 'pagehide' );
	}

	function recordStatusChange( status: ConnectionStatus ): void {
		ensureStarted();
		endedStatus = status.status;

		if ( status.status === 'connected' ) {
			if ( ! hasConnected ) {
				hasConnected = true;
				recordSyncMetricEvent( 'rtc_session_connected', {
					time_to_connect_bucket: getDurationBucket(
						Date.now() - startedAt
					),
				} );
			}

			if ( activeProblemStartedAt !== null ) {
				connectionRecoveryCount++;
				recordSyncMetricEvent( 'rtc_connection_recovered', {
					recovery_time_bucket: getDurationBucket(
						Date.now() - activeProblemStartedAt
					),
					recovered_by: 'automatic',
				} );
				activeProblemStartedAt = null;
			}
			return;
		}

		if (
			status.status === 'disconnected' &&
			activeProblemStartedAt === null
		) {
			activeProblemStartedAt = Date.now();
			connectionProblemCount++;
			recordSyncMetricEvent( 'rtc_connection_problem', {
				...getStatusProperties( status ),
			} );
		}
	}

	function wrapStatusChangeHandler(
		onStatusChange: OnStatusChangeCallback
	): OnStatusChangeCallback {
		return ( status ) => {
			onStatusChange( status );

			if ( status && suppressedStatusMetrics === 0 ) {
				recordStatusChange( status );
			}
		};
	}

	function withSuppressedStatusMetrics( callback: () => void ): void {
		suppressedStatusMetrics++;
		try {
			callback();
		} finally {
			suppressedStatusMetrics--;
		}
	}

	function recordLocalEditActivity( changedKeyCount: number ): void {
		if ( changedKeyCount <= 0 ) {
			return;
		}

		ensureStarted();
		localEditActivityCount++;
	}

	function recordRemoteEditActivity( changedKeyCount: number ): void {
		if ( changedKeyCount <= 0 ) {
			return;
		}

		ensureStarted();
		remoteEditActivityCount++;
	}

	function recordSummary( reason: SummaryReason ): void {
		if ( ! hasStarted ) {
			return;
		}

		recordSyncMetricEvent( 'rtc_session_summary', {
			summary_reason: reason,
			duration_bucket: getDurationBucket( Date.now() - startedAt ),
			connected: hasConnected,
			connection_problem_count_bucket: getCountBucket(
				connectionProblemCount
			),
			connection_recovery_count_bucket: getCountBucket(
				connectionRecoveryCount
			),
			local_edit_activity_count_bucket: getCountBucket(
				localEditActivityCount
			),
			remote_edit_activity_count_bucket: getCountBucket(
				remoteEditActivityCount
			),
			simultaneous_editing_observed:
				localEditActivityCount > 0 && remoteEditActivityCount > 0,
			ended_status: endedStatus,
		} );
	}

	function reset(): void {
		if ( typeof window !== 'undefined' && pageHideListenerRegistered ) {
			window.removeEventListener( 'pagehide', handlePageHide );
			pageHideListenerRegistered = false;
		}

		hasStarted = false;
		hasConnected = false;
		startedAt = 0;
		activeProblemStartedAt = null;
		connectionProblemCount = 0;
		connectionRecoveryCount = 0;
		localEditActivityCount = 0;
		remoteEditActivityCount = 0;
		endedStatus = 'unknown';
	}

	function endSession( reason: SummaryReason ): void {
		recordSummary( reason );
		reset();
	}

	return {
		endSession,
		ensureStarted,
		recordLocalEditActivity,
		recordRemoteEditActivity,
		wrapStatusChangeHandler,
		withSuppressedStatusMetrics,
	};
}
