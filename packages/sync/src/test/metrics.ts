/**
 * External dependencies
 */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from '@jest/globals';
import type { Awareness } from 'y-protocols/awareness';

/**
 * WordPress dependencies
 */
import { addAction, removeAllActions, type Callback } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { ConnectionError, ConnectionErrorCode } from '../errors';
import {
	SYNC_METRIC_EVENT_ACTION,
	createSyncMetricsSession,
	getObjectRoomPresenceProperties,
	normalizeConnectionErrorCode,
	recordSyncMetricEvent,
} from '../metrics';

describe( 'sync metrics', () => {
	let events: Array< {
		eventName: string;
		properties: Record< string, any >;
	} >;

	beforeEach( () => {
		events = [];
		removeAllActions( SYNC_METRIC_EVENT_ACTION, 'test/sync-metrics' );
		addAction( SYNC_METRIC_EVENT_ACTION, 'test/sync-metrics', ( (
			eventName: string,
			properties: Record< string, any >
		) => {
			events.push( { eventName, properties } );
		} ) as Callback );
	} );

	afterEach( () => {
		removeAllActions( SYNC_METRIC_EVENT_ACTION, 'test/sync-metrics' );
		jest.restoreAllMocks();
	} );

	it( 'records a schema version on metric events', () => {
		recordSyncMetricEvent( 'rtc_room_join_attempted', {
			entity_scope: 'record',
		} );

		expect( events ).toEqual( [
			{
				eventName: 'rtc_room_join_attempted',
				properties: {
					schema_version: 1,
					entity_scope: 'record',
				},
			},
		] );
	} );

	it( 'normalizes connection error codes', () => {
		expect(
			normalizeConnectionErrorCode(
				ConnectionErrorCode.AUTHENTICATION_FAILED
			)
		).toBe( 'authentication_failed' );
		expect(
			normalizeConnectionErrorCode(
				ConnectionErrorCode.CONNECTION_LIMIT_EXCEEDED
			)
		).toBe( 'connection_limit_exceeded' );
		expect( normalizeConnectionErrorCode() ).toBe( 'unknown_error' );
	} );

	it( 'deduplicates connection problems within a disconnected episode', () => {
		jest.spyOn( Date, 'now' ).mockReturnValue( 1000 );

		const session = createSyncMetricsSession();
		const onStatusChange = jest.fn();
		const wrappedOnStatusChange =
			session.wrapStatusChangeHandler( onStatusChange );

		session.ensureStarted( { initial_entity_scope: 'record' } );
		wrappedOnStatusChange( { status: 'connected' } );
		wrappedOnStatusChange( {
			status: 'disconnected',
			error: new ConnectionError(
				ConnectionErrorCode.CONNECTION_EXPIRED
			),
			canManuallyRetry: true,
			consecutiveFailures: 1,
			willAutoRetryInMs: 2000,
		} );
		wrappedOnStatusChange( {
			status: 'disconnected',
			error: new ConnectionError( ConnectionErrorCode.UNKNOWN_ERROR ),
			canManuallyRetry: true,
			consecutiveFailures: 2,
			willAutoRetryInMs: 4000,
		} );
		wrappedOnStatusChange( { status: 'connected' } );

		expect( onStatusChange ).toHaveBeenCalledTimes( 4 );
		expect( events.map( ( event ) => event.eventName ) ).toEqual( [
			'rtc_room_join_attempted',
			'rtc_room_joined',
			'rtc_connection_problem',
			'rtc_connection_recovered',
		] );
		expect( events[ 2 ].properties ).toMatchObject( {
			connection_error_code: 'connection_expired',
			can_manually_retry: true,
			consecutive_failure_count: 1,
			will_auto_retry_in_ms: 2000,
		} );
		expect( events[ 3 ].properties ).toMatchObject( {
			previous_connection_error_code: 'connection_expired',
			recovery_time_ms: 0,
		} );
	} );

	it( 'suppresses status metrics during provider cleanup', () => {
		const session = createSyncMetricsSession();
		const wrappedOnStatusChange = session.wrapStatusChangeHandler(
			jest.fn()
		);

		session.ensureStarted( { initial_entity_scope: 'record' } );
		wrappedOnStatusChange( { status: 'connected' } );
		session.withSuppressedStatusMetrics( () => {
			wrappedOnStatusChange( {
				status: 'disconnected',
				error: new ConnectionError( ConnectionErrorCode.UNKNOWN_ERROR ),
			} );
		} );

		expect( events.map( ( event ) => event.eventName ) ).toEqual( [
			'rtc_room_join_attempted',
			'rtc_room_joined',
		] );
	} );

	it( 'does not record room left when the room never joined', () => {
		const session = createSyncMetricsSession();
		const wrappedOnStatusChange = session.wrapStatusChangeHandler(
			jest.fn()
		);

		session.ensureStarted( { initial_entity_scope: 'record' } );
		wrappedOnStatusChange( {
			status: 'disconnected',
			error: new ConnectionError( ConnectionErrorCode.UNKNOWN_ERROR ),
		} );
		session.endSession( 'unload_all' );

		expect( events.map( ( event ) => event.eventName ) ).toEqual( [
			'rtc_room_join_attempted',
			'rtc_connection_problem',
			'rtc_session_ended',
		] );
		expect( events[ 2 ].properties ).toMatchObject( {
			connected: false,
		} );
	} );

	it( 'derives raw room presence counts from awareness state', () => {
		expect(
			getObjectRoomPresenceProperties(
				{
					1: { collaboratorInfo: { id: 100 } },
					2: { collaboratorInfo: { id: 100 } },
					3: { collaboratorInfo: { id: 200 } },
				},
				1
			)
		).toEqual( {
			participant_count: 3,
			distinct_user_count: 2,
			current_user_active_instance_count: 2,
			other_distinct_user_count: 1,
			duplicate_user_instance_count: 1,
		} );
	} );

	it( 'records primary awareness peak counts', () => {
		const session = createSyncMetricsSession();
		const changeCallbacks = new Set< () => void >();
		const states = new Map< number, object >( [
			[ 1, { collaboratorInfo: { id: 100 } } ],
		] );
		const awareness = {
			clientID: 1,
			getStates: () => states,
			on: jest.fn( ( event: string, callback: () => void ) => {
				if ( event === 'change' ) {
					changeCallbacks.add( callback );
				}
			} ),
			off: jest.fn( ( event: string, callback: () => void ) => {
				if ( event === 'change' ) {
					changeCallbacks.delete( callback );
				}
			} ),
		} as unknown as Awareness;

		const stopObserving = session.observePrimaryAwareness( awareness );
		session.ensureStarted( { entity_scope: 'record' } );
		states.set( 2, { collaboratorInfo: { id: 100 } } );
		changeCallbacks.forEach( ( callback ) => callback() );
		states.set( 3, { collaboratorInfo: { id: 200 } } );
		changeCallbacks.forEach( ( callback ) => callback() );
		stopObserving();
		states.set( 4, { collaboratorInfo: { id: 300 } } );
		changeCallbacks.forEach( ( callback ) => callback() );
		session.endSession( 'unload_all' );

		expect( events[ events.length - 1 ] ).toMatchObject( {
			eventName: 'rtc_session_ended',
			properties: {
				schema_version: 1,
				peak_participant_count: 3,
				peak_distinct_user_count: 2,
				peak_current_user_active_instance_count: 2,
				peak_duplicate_user_instance_count: 1,
			},
		} );
	} );

	it( 'records raw edit activity windows and session end summary', () => {
		const session = createSyncMetricsSession();

		session.ensureStarted( { entity_scope: 'record' } );
		session.recordLocalEditActivity( 2 );
		session.recordRemoteEditActivity( 3 );
		session.endSession( 'unload_all' );

		expect(
			events.find(
				( event ) => event.eventName === 'rtc_edit_activity_window'
			)
		).toMatchObject( {
			properties: {
				local_edit_operation_count: 1,
				remote_edit_operation_count: 1,
				local_changed_field_count: 2,
				remote_changed_field_count: 3,
				simultaneous_edit_activity_observed: true,
			},
		} );
		expect( events[ events.length - 1 ] ).toMatchObject( {
			eventName: 'rtc_session_ended',
			properties: {
				schema_version: 1,
				end_reason: 'unload_all',
				local_edit_operation_count: 1,
				remote_edit_operation_count: 1,
				local_changed_field_count: 2,
				remote_changed_field_count: 3,
				simultaneous_edit_activity_observed: true,
			},
		} );
	} );
} );
