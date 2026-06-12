/**
 * WordPress dependencies
 */
import { doAction } from '@wordpress/hooks';

/**
 * External dependencies
 */
import type { Awareness } from 'y-protocols/awareness';

/**
 * Internal dependencies
 */
import { ConnectionErrorCode } from './errors';
import type { ConnectionStatus, OnStatusChangeCallback } from './types';

export const SYNC_METRIC_EVENT_ACTION = 'sync.metricEvent';
export const SYNC_METRIC_SCHEMA_VERSION = 1;

const EDIT_ACTIVITY_WINDOW_MS = 60000;

type SyncMetricProperties = Record< string, unknown >;

type SummaryReason = 'pagehide' | 'unload_all';

type CollaboratorId = string | number;

interface RoomPresenceProperties {
	participant_count: number;
	distinct_user_count?: number;
	current_user_active_instance_count?: number;
	other_distinct_user_count?: number;
	duplicate_user_instance_count?: number;
}

function omitUndefinedProperties(
	properties: SyncMetricProperties
): SyncMetricProperties {
	return Object.fromEntries(
		Object.entries( properties ).filter(
			( [ , value ] ) => value !== undefined
		)
	);
}

function createEphemeralId(): string {
	if ( globalThis.crypto?.randomUUID ) {
		return globalThis.crypto.randomUUID();
	}

	return `${ Date.now().toString( 36 ) }-${ Math.random()
		.toString( 36 )
		.slice( 2 ) }`;
}

export function recordSyncMetricEvent(
	eventName: string,
	properties: SyncMetricProperties = {}
): void {
	doAction(
		SYNC_METRIC_EVENT_ACTION,
		eventName,
		omitUndefinedProperties( {
			schema_version: SYNC_METRIC_SCHEMA_VERSION,
			...properties,
		} )
	);
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

function getCollaboratorId( state: unknown ): CollaboratorId | undefined {
	if ( ! state || typeof state !== 'object' ) {
		return undefined;
	}

	const awarenessState = state as {
		collaboratorInfo?: { id?: CollaboratorId | null };
	};
	const id = awarenessState.collaboratorInfo?.id;

	if ( id === null || id === undefined ) {
		return undefined;
	}

	return id;
}

function areSameClientId(
	clientId: unknown,
	expectedClientId: unknown
): boolean {
	return String( clientId ) === String( expectedClientId );
}

function getRoomPresencePropertiesFromEntries(
	entries: Iterable< [ unknown, unknown ] >,
	localClientId?: unknown
): RoomPresenceProperties {
	const states = Array.from( entries );
	const participantCount = states.length;
	const collaboratorIds: CollaboratorId[] = [];
	let localCollaboratorId: CollaboratorId | undefined;
	let hasMissingCollaboratorId = false;

	states.forEach( ( [ clientId, state ] ) => {
		const collaboratorId = getCollaboratorId( state );
		if ( collaboratorId === undefined ) {
			hasMissingCollaboratorId = true;
			return;
		}

		collaboratorIds.push( collaboratorId );

		if (
			localClientId !== undefined &&
			areSameClientId( clientId, localClientId )
		) {
			localCollaboratorId = collaboratorId;
		}
	} );

	if ( hasMissingCollaboratorId ) {
		return {
			participant_count: participantCount,
		};
	}

	const distinctUserCount = new Set(
		collaboratorIds.map( ( id ) => String( id ) )
	).size;
	const properties: RoomPresenceProperties = {
		participant_count: participantCount,
		distinct_user_count: distinctUserCount,
		duplicate_user_instance_count: participantCount - distinctUserCount,
	};

	if ( localCollaboratorId !== undefined ) {
		const currentUserActiveInstanceCount = collaboratorIds.filter(
			( id ) => String( id ) === String( localCollaboratorId )
		).length;
		properties.current_user_active_instance_count =
			currentUserActiveInstanceCount;
		properties.other_distinct_user_count =
			distinctUserCount > 0 ? distinctUserCount - 1 : 0;
	}

	return properties;
}

export function getAwarenessRoomPresenceProperties(
	awareness: Awareness
): RoomPresenceProperties {
	return getRoomPresencePropertiesFromEntries(
		awareness.getStates().entries(),
		awareness.clientID
	);
}

export function getObjectRoomPresenceProperties(
	awareness: Record< string, unknown >,
	localClientId?: string | number
): RoomPresenceProperties {
	return getRoomPresencePropertiesFromEntries(
		Object.entries( awareness ),
		localClientId
	);
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
		consecutive_failure_count: status.consecutiveFailures,
		will_auto_retry_in_ms: status.willAutoRetryInMs,
		visibility_state: getVisibilityState(),
		network_state: getNetworkState(),
	};
}

export function createSyncMetricsSession() {
	const sessionProperties = {
		rtc_session_id: createEphemeralId(),
		editor_instance_id: createEphemeralId(),
	};

	let initialProperties: SyncMetricProperties = {};
	let hasStarted = false;
	let hasJoined = false;
	let hasEnded = false;
	let startedAt = 0;
	let activeProblemStartedAt: number | null = null;
	let activeProblemId: string | null = null;
	let activeProblemErrorCode: string | undefined;
	let connectedStartedAt: number | null = null;
	let connectedDurationMs = 0;
	let disconnectedDurationMs = 0;
	let collaborationStartedAt: number | null = null;
	let collaborativeDurationMs = 0;
	let connectionProblemCount = 0;
	let connectionRecoveryCount = 0;
	let localEditOperationCount = 0;
	let remoteEditOperationCount = 0;
	let localChangedFieldCount = 0;
	let remoteChangedFieldCount = 0;
	let localEditActivityWindowCount = 0;
	let remoteEditActivityWindowCount = 0;
	let simultaneousEditActivityWindowCount = 0;
	let endedStatus = 'unknown';
	let pageHideListenerRegistered = false;
	let suppressedStatusMetrics = 0;
	let lastPresenceProperties: RoomPresenceProperties | undefined;
	let peakParticipantCount = 0;
	let peakDistinctUserCount: number | undefined;
	let peakCurrentUserActiveInstanceCount: number | undefined;
	let peakDuplicateUserInstanceCount: number | undefined;
	let editWindowStartedAt: number | null = null;
	let editWindowLocalOperationCount = 0;
	let editWindowRemoteOperationCount = 0;
	let editWindowLocalChangedFieldCount = 0;
	let editWindowRemoteChangedFieldCount = 0;

	function recordSessionMetricEvent(
		eventName: string,
		properties: SyncMetricProperties = {}
	): void {
		recordSyncMetricEvent( eventName, {
			...sessionProperties,
			...initialProperties,
			...properties,
		} );
	}

	function ensureStarted( properties: SyncMetricProperties = {} ): void {
		if ( hasStarted ) {
			return;
		}

		hasStarted = true;
		startedAt = Date.now();
		initialProperties = properties;

		recordSessionMetricEvent( 'rtc_room_join_attempted', {
			attempt_number: 1,
			attempt_source: 'initial_load',
			event_emitter: 'client',
		} );

		if ( typeof window !== 'undefined' && ! pageHideListenerRegistered ) {
			window.addEventListener( 'pagehide', handlePageHide );
			pageHideListenerRegistered = true;
		}
	}

	function handlePageHide(): void {
		recordSummary( 'pagehide' );
	}

	function getConnectedDurationMs( now = Date.now() ): number {
		return (
			connectedDurationMs +
			( connectedStartedAt === null ? 0 : now - connectedStartedAt )
		);
	}

	function getDisconnectedDurationMs( now = Date.now() ): number {
		return (
			disconnectedDurationMs +
			( activeProblemStartedAt === null
				? 0
				: now - activeProblemStartedAt )
		);
	}

	function getCollaborativeDurationMs( now = Date.now() ): number {
		return (
			collaborativeDurationMs +
			( collaborationStartedAt === null
				? 0
				: now - collaborationStartedAt )
		);
	}

	function updatePresencePeaks(
		presenceProperties: RoomPresenceProperties
	): void {
		peakParticipantCount = Math.max(
			peakParticipantCount,
			presenceProperties.participant_count
		);

		if ( presenceProperties.distinct_user_count !== undefined ) {
			peakDistinctUserCount = Math.max(
				peakDistinctUserCount ?? 0,
				presenceProperties.distinct_user_count
			);
		}

		if (
			presenceProperties.current_user_active_instance_count !== undefined
		) {
			peakCurrentUserActiveInstanceCount = Math.max(
				peakCurrentUserActiveInstanceCount ?? 0,
				presenceProperties.current_user_active_instance_count
			);
		}

		if ( presenceProperties.duplicate_user_instance_count !== undefined ) {
			peakDuplicateUserInstanceCount = Math.max(
				peakDuplicateUserInstanceCount ?? 0,
				presenceProperties.duplicate_user_instance_count
			);
		}
	}

	function updateCollaborativeDuration(
		nextPresenceProperties: RoomPresenceProperties
	): void {
		const now = Date.now();
		const wasCollaborating =
			( lastPresenceProperties?.participant_count ?? 0 ) > 1;
		const isCollaborating = nextPresenceProperties.participant_count > 1;

		if ( ! wasCollaborating && isCollaborating ) {
			collaborationStartedAt = now;
		}

		if (
			wasCollaborating &&
			! isCollaborating &&
			collaborationStartedAt !== null
		) {
			collaborativeDurationMs += now - collaborationStartedAt;
			collaborationStartedAt = null;
		}
	}

	function updatePresence(
		presenceProperties: RoomPresenceProperties
	): void {
		updateCollaborativeDuration( presenceProperties );
		lastPresenceProperties = presenceProperties;
		updatePresencePeaks( presenceProperties );
	}

	function recordStatusChange( status: ConnectionStatus ): void {
		ensureStarted();
		endedStatus = status.status;

		if ( status.status === 'connected' ) {
			const now = Date.now();
			if ( connectedStartedAt === null ) {
				connectedStartedAt = now;
			}

			if ( ! hasJoined ) {
				hasJoined = true;
				recordSessionMetricEvent( 'rtc_room_joined', {
					time_to_connect_ms: now - startedAt,
					event_emitter: 'client',
					...lastPresenceProperties,
				} );
			}

			if ( activeProblemStartedAt !== null ) {
				connectionRecoveryCount++;
				disconnectedDurationMs += now - activeProblemStartedAt;
				recordSessionMetricEvent( 'rtc_connection_recovered', {
					rtc_problem_id: activeProblemId,
					previous_connection_error_code: activeProblemErrorCode,
					recovery_time_ms: now - activeProblemStartedAt,
					recovered_by: 'automatic',
					...lastPresenceProperties,
				} );
				activeProblemStartedAt = null;
				activeProblemId = null;
				activeProblemErrorCode = undefined;
			}
			return;
		}

		if (
			status.status === 'disconnected' &&
			activeProblemStartedAt === null
		) {
			const now = Date.now();
			if ( connectedStartedAt !== null ) {
				connectedDurationMs += now - connectedStartedAt;
				connectedStartedAt = null;
			}

			activeProblemStartedAt = now;
			activeProblemId = createEphemeralId();
			activeProblemErrorCode = normalizeConnectionErrorCode(
				status.error?.code
			);
			connectionProblemCount++;
			recordSessionMetricEvent( 'rtc_connection_problem', {
				rtc_problem_id: activeProblemId,
				...getStatusProperties( status ),
				...lastPresenceProperties,
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

	function recordAwarenessPresence( awareness: Awareness ): void {
		const presenceProperties =
			getAwarenessRoomPresenceProperties( awareness );

		if ( presenceProperties.participant_count <= 0 ) {
			return;
		}

		updatePresence( presenceProperties );
	}

	function observePrimaryAwareness( awareness: Awareness ): () => void {
		const recordPresence = () => recordAwarenessPresence( awareness );

		recordPresence();
		awareness.on( 'change', recordPresence );

		return () => awareness.off( 'change', recordPresence );
	}

	function flushEditActivityWindow( now = Date.now() ): void {
		if ( editWindowStartedAt === null ) {
			return;
		}

		if (
			editWindowLocalOperationCount === 0 &&
			editWindowRemoteOperationCount === 0
		) {
			editWindowStartedAt = null;
			return;
		}

		const hadLocalEditActivity = editWindowLocalOperationCount > 0;
		const hadRemoteEditActivity = editWindowRemoteOperationCount > 0;
		const simultaneousEditActivityObserved =
			hadLocalEditActivity && hadRemoteEditActivity;

		if ( hadLocalEditActivity ) {
			localEditActivityWindowCount++;
		}
		if ( hadRemoteEditActivity ) {
			remoteEditActivityWindowCount++;
		}
		if ( simultaneousEditActivityObserved ) {
			simultaneousEditActivityWindowCount++;
		}

		recordSessionMetricEvent( 'rtc_edit_activity_window', {
			window_duration_ms: now - editWindowStartedAt,
			...lastPresenceProperties,
			local_edit_operation_count: editWindowLocalOperationCount,
			remote_edit_operation_count: editWindowRemoteOperationCount,
			local_changed_field_count: editWindowLocalChangedFieldCount,
			remote_changed_field_count: editWindowRemoteChangedFieldCount,
			had_local_edit_activity: hadLocalEditActivity,
			had_remote_edit_activity: hadRemoteEditActivity,
			simultaneous_edit_activity_observed:
				simultaneousEditActivityObserved,
		} );

		editWindowStartedAt = null;
		editWindowLocalOperationCount = 0;
		editWindowRemoteOperationCount = 0;
		editWindowLocalChangedFieldCount = 0;
		editWindowRemoteChangedFieldCount = 0;
	}

	function ensureEditActivityWindow( now = Date.now() ): void {
		if (
			editWindowStartedAt !== null &&
			now - editWindowStartedAt >= EDIT_ACTIVITY_WINDOW_MS
		) {
			flushEditActivityWindow( now );
		}

		if ( editWindowStartedAt === null ) {
			editWindowStartedAt = now;
		}
	}

	function recordLocalEditActivity( changedKeyCount: number ): void {
		if ( changedKeyCount <= 0 ) {
			return;
		}

		ensureStarted();
		ensureEditActivityWindow();
		localEditOperationCount++;
		localChangedFieldCount += changedKeyCount;
		editWindowLocalOperationCount++;
		editWindowLocalChangedFieldCount += changedKeyCount;
	}

	function recordRemoteEditActivity( changedKeyCount: number ): void {
		if ( changedKeyCount <= 0 ) {
			return;
		}

		ensureStarted();
		ensureEditActivityWindow();
		remoteEditOperationCount++;
		remoteChangedFieldCount += changedKeyCount;
		editWindowRemoteOperationCount++;
		editWindowRemoteChangedFieldCount += changedKeyCount;
	}

	function recordSummary( reason: SummaryReason ): void {
		if ( ! hasStarted || hasEnded ) {
			return;
		}

		hasEnded = true;
		const now = Date.now();
		flushEditActivityWindow( now );

		const sessionDurationMs = now - startedAt;
		const connectedDuration = getConnectedDurationMs( now );
		const disconnectedDuration = getDisconnectedDurationMs( now );
		const collaborativeDuration = getCollaborativeDurationMs( now );

		if ( hasJoined ) {
			recordSessionMetricEvent( 'rtc_room_left', {
				leave_reason: reason,
				session_duration_ms: sessionDurationMs,
				connected_duration_ms: connectedDuration,
				participant_count_before_leave:
					lastPresenceProperties?.participant_count,
				distinct_user_count_before_leave:
					lastPresenceProperties?.distinct_user_count,
			} );
		}

		recordSessionMetricEvent( 'rtc_session_ended', {
			end_reason: reason,
			session_duration_ms: sessionDurationMs,
			connected_duration_ms: connectedDuration,
			disconnected_duration_ms: disconnectedDuration,
			collaborative_duration_ms: collaborativeDuration,
			connected: hasJoined,
			peak_participant_count: peakParticipantCount,
			peak_distinct_user_count: peakDistinctUserCount,
			peak_current_user_active_instance_count:
				peakCurrentUserActiveInstanceCount,
			peak_duplicate_user_instance_count: peakDuplicateUserInstanceCount,
			connection_problem_count: connectionProblemCount,
			connection_recovery_count: connectionRecoveryCount,
			local_edit_operation_count: localEditOperationCount,
			remote_edit_operation_count: remoteEditOperationCount,
			local_changed_field_count: localChangedFieldCount,
			remote_changed_field_count: remoteChangedFieldCount,
			local_edit_activity_window_count: localEditActivityWindowCount,
			remote_edit_activity_window_count: remoteEditActivityWindowCount,
			simultaneous_edit_activity_window_count:
				simultaneousEditActivityWindowCount,
			simultaneous_edit_activity_observed:
				localEditOperationCount > 0 && remoteEditOperationCount > 0,
			ended_status: endedStatus,
		} );
	}

	function reset(): void {
		if ( typeof window !== 'undefined' && pageHideListenerRegistered ) {
			window.removeEventListener( 'pagehide', handlePageHide );
			pageHideListenerRegistered = false;
		}

		initialProperties = {};
		hasStarted = false;
		hasJoined = false;
		hasEnded = false;
		startedAt = 0;
		activeProblemStartedAt = null;
		activeProblemId = null;
		activeProblemErrorCode = undefined;
		connectedStartedAt = null;
		connectedDurationMs = 0;
		disconnectedDurationMs = 0;
		collaborationStartedAt = null;
		collaborativeDurationMs = 0;
		connectionProblemCount = 0;
		connectionRecoveryCount = 0;
		localEditOperationCount = 0;
		remoteEditOperationCount = 0;
		localChangedFieldCount = 0;
		remoteChangedFieldCount = 0;
		localEditActivityWindowCount = 0;
		remoteEditActivityWindowCount = 0;
		simultaneousEditActivityWindowCount = 0;
		endedStatus = 'unknown';
		lastPresenceProperties = undefined;
		peakParticipantCount = 0;
		peakDistinctUserCount = undefined;
		peakCurrentUserActiveInstanceCount = undefined;
		peakDuplicateUserInstanceCount = undefined;
		editWindowStartedAt = null;
		editWindowLocalOperationCount = 0;
		editWindowRemoteOperationCount = 0;
		editWindowLocalChangedFieldCount = 0;
		editWindowRemoteChangedFieldCount = 0;
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
		observePrimaryAwareness,
		wrapStatusChangeHandler,
		withSuppressedStatusMetrics,
	};
}
