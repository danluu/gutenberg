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
	getCountBucket,
	getDurationBucket,
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
		recordSyncMetricEvent( 'rtc_session_started', {
			initial_entity_scope: 'record',
		} );

		expect( events ).toEqual( [
			{
				eventName: 'rtc_session_started',
				properties: {
					schema_version: 1,
					initial_entity_scope: 'record',
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

	it( 'buckets counts and durations', () => {
		expect( getCountBucket( 0 ) ).toBe( '0' );
		expect( getCountBucket( 4 ) ).toBe( '3_4' );
		expect( getCountBucket( 5 ) ).toBe( '5_9' );
		expect( getCountBucket( 10 ) ).toBe( '10_14' );
		expect( getCountBucket( 15 ) ).toBe( '15_19' );
		expect( getCountBucket( 20 ) ).toBe( '20_24' );
		expect( getCountBucket( 25 ) ).toBe( '25_29' );
		expect( getCountBucket( 30 ) ).toBe( '30_plus' );

		expect( getDurationBucket( 1000 ) ).toBe( 'lt_2s' );
		expect( getDurationBucket( 2000 ) ).toBe( '2_10s' );
		expect( getDurationBucket( 30000 ) ).toBe( '30_60s' );
		expect( getDurationBucket( 1800000 ) ).toBe( '30m_plus' );
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
			'rtc_session_started',
			'rtc_session_connected',
			'rtc_connection_problem',
			'rtc_connection_recovered',
		] );
		expect( events[ 2 ].properties ).toMatchObject( {
			connection_error_code: 'connection_expired',
			can_manually_retry: true,
			consecutive_failures_bucket: '1',
			will_auto_retry_bucket: '2_10s',
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
			'rtc_session_started',
			'rtc_session_connected',
		] );
	} );

	it( 'records a bucketed session summary with edit activity', () => {
		const session = createSyncMetricsSession();

		session.ensureStarted( { initial_entity_scope: 'record' } );
		session.recordLocalEditActivity( 1 );
		session.recordRemoteEditActivity( 1 );
		session.endSession( 'unload_all' );

		expect( events[ events.length - 1 ] ).toMatchObject( {
			eventName: 'rtc_session_summary',
			properties: {
				schema_version: 1,
				summary_reason: 'unload_all',
				local_edit_activity_count_bucket: '1',
				remote_edit_activity_count_bucket: '1',
				simultaneous_editing_observed: true,
			},
		} );
	} );
} );
