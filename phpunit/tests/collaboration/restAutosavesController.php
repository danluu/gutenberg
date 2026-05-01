<?php
/**
 * Tests for RTC autosave behavior.
 *
 * @package gutenberg
 * @subpackage Collaboration
 *
 * @group collaboration
 * @group restapi
 */
class Tests_Collaboration_RestAutosavesController extends WP_UnitTestCase {

	protected static int $editor_id;

	public static function wpSetUpBeforeClass( WP_UnitTest_Factory $factory ) {
		self::$editor_id = $factory->user->create( array( 'role' => 'editor' ) );
	}

	public static function wpTearDownAfterClass() {
		self::delete_user( self::$editor_id );
		delete_option( 'wp_collaboration_enabled' );
	}

	public function set_up() {
		parent::set_up();
		wp_set_current_user( self::$editor_id );
	}

	/**
	 * @return array<string, array{int, string, bool}>
	 */
	public function data_rtc_autosave_visibility_fuzz_cases(): array {
		$cases = array();
		for ( $seed = 1; $seed <= 12; $seed++ ) {
			$post_status              = 0 === $seed % 2 ? 'draft' : 'auto-draft';
			$collaboration_enabled    = 0 !== $seed % 3;
			$cases[ 'seed-' . $seed ] = array(
				$seed,
				$post_status,
				$collaboration_enabled,
			);
		}
		return $cases;
	}

	/**
	 * Autosaving an auto-draft through RTC must promote/update the parent post so
	 * a new post survives URL loss and appears in Drafts.
	 *
	 * @dataProvider data_rtc_autosave_visibility_fuzz_cases
	 *
	 * @param int    $seed                  Deterministic case seed.
	 * @param string $post_status           Initial post status.
	 * @param bool   $collaboration_enabled Whether RTC is enabled.
	 */
	public function test_rtc_autosave_visibility_fuzz( int $seed, string $post_status, bool $collaboration_enabled ): void {
		update_option( 'wp_collaboration_enabled', $collaboration_enabled ? '1' : '0' );

		$post_id = wp_insert_post(
			array(
				'post_author'  => self::$editor_id,
				'post_content' => '<!-- wp:paragraph --><p>initial</p><!-- /wp:paragraph -->',
				'post_status'  => $post_status,
				'post_title'   => 'Autosave fuzz seed ' . $seed,
				'post_type'    => 'post',
			),
			true
		);
		$this->assertIsInt( $post_id );

		$next_content = sprintf(
			'<!-- wp:paragraph --><p>autosaved seed %d</p><!-- /wp:paragraph -->',
			$seed
		);
		$request      = new WP_REST_Request( 'POST', '/wp/v2/posts/' . $post_id . '/autosaves' );
		$request->set_body_params(
			array(
				'content' => $next_content,
				'status'  => 'draft',
				'title'   => 'Autosaved fuzz seed ' . $seed,
			)
		);

		$response = rest_do_request( $request );
		$this->assertContains(
			$response->get_status(),
			array( 200, 201 ),
			'Autosave request should succeed for seed ' . $seed
		);

		$data                   = $response->get_data();
		$parent                 = get_post( $post_id );
		$expect_parent_autosave = 'auto-draft' === $post_status || ! $collaboration_enabled;

		if ( $expect_parent_autosave ) {
			$this->assertSame(
				$post_id,
				$data['id'],
				'Parent post should be updated instead of creating an unreachable autosave revision for seed ' . $seed
			);
			$this->assertSame( 'draft', $parent->post_status );
			$this->assertSame( $next_content, $parent->post_content );
		} else {
			$this->assertNotSame(
				$post_id,
				$data['id'],
				'RTC draft autosaves can remain revision-backed for seed ' . $seed
			);
			$this->assertSame( $post_status, $parent->post_status );
			$this->assertNotSame( $next_content, $parent->post_content );
		}
	}
}
