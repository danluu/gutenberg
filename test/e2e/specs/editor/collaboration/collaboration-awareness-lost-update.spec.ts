/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

type RaceTraceEvent = {
	event: string;
	injection_point?: string;
	client_id?: number;
};

type AwarenessState = {
	cursor: string;
	source: string;
};

type AwarenessRaceResponse = {
	trace: RaceTraceEvent[];
	staleAwareness: AwarenessState;
	completedAwareness: AwarenessState;
	responseAwareness: Record< string, AwarenessState >;
	storedAwareness: Record< string, AwarenessState >;
	injectionAnnotation: string;
	practiceAnnotation: string;
};

const AWARENESS_LOST_UPDATE_ANNOTATIONS = [
	{
		type: 'fuzzer-bug',
		description:
			'RTC fuzzer issue 9: awareness read-modify-write can lose a completed client state.',
	},
	{
		type: 'event-injection',
		description:
			'The test injects the completed storage write for a second HTTP polling request because Playwright cannot schedule PHP to pause exactly after an awareness read and before the matching write.',
	},
	{
		type: 'practical-reachability',
		description:
			'This interleaving can happen in practice when two editor tabs poll /wp-sync/v1/updates concurrently for the same room and one PHP request completes while another request is between its awareness read and write.',
	},
];

test.describe( 'Collaboration - awareness lost update', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin(
			'gutenberg-test-plugin-sync-awareness-lost-update-race'
		);
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deactivatePlugin(
			'gutenberg-test-plugin-sync-awareness-lost-update-race'
		);
	} );

	test(
		'preserves a completed concurrent awareness write',
		{ annotation: AWARENESS_LOST_UPDATE_ANNOTATIONS },
		async ( { admin, requestUtils, page } ) => {
			const post = await requestUtils.createPost( {
				title: 'Awareness Lost Update Race',
				status: 'draft',
				date_gmt: new Date().toISOString(),
			} );
			const noncePost = await requestUtils.createPost( {
				title: 'Awareness Lost Update Nonce Source',
				status: 'draft',
				date_gmt: new Date().toISOString(),
			} );

			await admin.visitAdminPage(
				'post.php',
				`post=${ noncePost.id }&action=edit`
			);

			const result = await page.evaluate(
				async ( { room } ) => {
					const wpApiSettings = (
						window as typeof window & {
							wpApiSettings?: {
								nonce?: string;
								root?: string;
							};
						}
					 ).wpApiSettings;
					if ( ! wpApiSettings?.nonce || ! wpApiSettings?.root ) {
						throw new Error(
							'REST API settings were not available on the editor page.'
						);
					}

					const endpoint =
						wpApiSettings.root +
						'gutenberg-test/v1/sync-awareness-lost-update';
					const response = await window.fetch( endpoint, {
						method: 'POST',
						credentials: 'same-origin',
						headers: {
							'Content-Type': 'application/json',
							'X-WP-Nonce': wpApiSettings.nonce,
						},
						body: JSON.stringify( { room } ),
					} );

					if ( ! response.ok ) {
						throw new Error( await response.text() );
					}

					return response.json();
				},
				{
					room: `postType/post:${ post.id }`,
				}
			);

			const race = result as AwarenessRaceResponse;
			const injection = race.trace.find(
				( event ) =>
					event.event === 'injected_concurrent_awareness_write'
			);

			expect( injection ).toBeTruthy();
			expect( [ 'after_stale_read', 'before_atomic_update' ] ).toContain(
				injection?.injection_point
			);
			expect(
				race.trace.some( ( event ) =>
					[
						'stale_request_read_awareness',
						'stale_request_entered_atomic_update',
					].includes( event.event )
				)
			).toBe( true );

			expect( race.responseAwareness[ '1' ] ).toEqual(
				race.staleAwareness
			);
			expect( race.responseAwareness[ '2' ] ).toEqual(
				injection?.injection_point === 'before_atomic_update'
					? race.completedAwareness
					: undefined
			);
			expect( race.storedAwareness[ '1' ] ).toEqual(
				race.staleAwareness
			);
			expect( race.storedAwareness[ '2' ] ).toEqual(
				race.completedAwareness
			);
			expect( race.injectionAnnotation ).toContain(
				'injects the storage effect'
			);
			expect( race.practiceAnnotation ).toContain(
				'two editor tabs can poll'
			);
		}
	);
} );
