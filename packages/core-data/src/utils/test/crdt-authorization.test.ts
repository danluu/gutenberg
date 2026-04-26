/**
 * External dependencies
 */
import { describe, expect, it } from '@jest/globals';

/**
 * WordPress dependencies
 */
import { Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import {
	applyPostChangesToCRDTDoc,
	getPostChangesFromCRDTDoc,
	type PostChanges,
} from '../crdt';
import type { Post } from '../../entity-types';

const syncedProperties = new Set< string >( [
	'author',
	'blocks',
	'categories',
	'comment_status',
	'content',
	'date',
	'excerpt',
	'featured_media',
	'format',
	'meta',
	'ping_status',
	'slug',
	'status',
	'sticky',
	'template',
	'title',
] );

function createPostRecord(): Post {
	return {
		author: 1,
		categories: [ 11 ],
		content: 'Initial content',
		date: '2026-03-01T10:00:00',
		excerpt: 'Initial excerpt',
		featured_media: 0,
		id: 101,
		meta: {
			rtc_privileged_meta: 'admin-only original',
		},
		modified: '2026-03-02T10:00:00',
		status: 'draft',
		title: 'Initial title',
	} as unknown as Post;
}

describe( 'CRDT authorization', () => {
	it( 'does not surface lower-privilege remote post fields as local save edits', () => {
		const privilegedDoc = new Y.Doc();
		const limitedDoc = new Y.Doc();
		const privilegedRecord = createPostRecord();

		try {
			applyPostChangesToCRDTDoc(
				privilegedDoc,
				privilegedRecord as PostChanges,
				syncedProperties
			);
			Y.applyUpdateV2(
				limitedDoc,
				Y.encodeStateAsUpdateV2( privilegedDoc )
			);

			applyPostChangesToCRDTDoc(
				limitedDoc,
				{
					author: 2,
					categories: [ 12 ],
					content:
						'<!-- wp:html -->\n<script>alert( "pwned" );</script>\n<!-- /wp:html -->',
					meta: {
						rtc_privileged_meta: 'changed by limited peer',
					},
					status: 'publish',
					title: 'Collaborative title',
				} as PostChanges,
				syncedProperties
			);
			Y.applyUpdateV2(
				privilegedDoc,
				Y.encodeStateAsUpdateV2(
					limitedDoc,
					Y.encodeStateVector( privilegedDoc )
				)
			);

			const changes = getPostChangesFromCRDTDoc(
				privilegedDoc,
				privilegedRecord,
				syncedProperties
			);

			expect( changes ).not.toHaveProperty( 'author' );
			expect( changes ).not.toHaveProperty( 'categories' );
			expect( changes ).not.toHaveProperty( 'content' );
			expect( changes ).not.toHaveProperty( 'meta' );
			expect( changes ).not.toHaveProperty( 'status' );
			expect( changes ).toHaveProperty( 'title', 'Collaborative title' );
		} finally {
			privilegedDoc.destroy();
			limitedDoc.destroy();
		}
	} );
} );
