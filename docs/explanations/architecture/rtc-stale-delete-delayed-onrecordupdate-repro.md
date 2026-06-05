# RTC stale delete delayed `onRecordUpdate()` repro

This note documents a focused, deterministic repro for a real-time
collaboration stale-delete schedule in post block syncing. The schedule is the
one where a remote block delete has already reached the CRDT document, but the
local editor entity has not yet been refreshed by `onRecordUpdate()`. If the
local user edits another block during that delay, the stale local entity can
publish an old block list that still contains the remotely deleted block.

The repro is intended to live as a Jest test in
`packages/core-data/src/utils/test/crdt.ts`:

```ts
it( 'does not resurrect a remotely deleted block from a delayed onRecordUpdate stale local edit', () => {
	const paragraph = ( clientId: string, content: string ): Block => ( {
		attributes: { content },
		clientId,
		innerBlocks: [],
		name: 'core/paragraph',
	} );
	const applyPostChangesWithBase = applyPostChangesToCRDTDoc as (
		ydoc: Y.Doc,
		changes: { blocks: Block[] },
		syncedProperties: Set< string >,
		options?: { baseRecord?: { blocks: Block[] } }
	) => void;
	const getBlockContents = () =>
		( ( map.get( 'blocks' ) as YBlocks ).toJSON() as Block[] ).map(
			( block ) => block.attributes.content
		);

	const baseBlocks = [
		paragraph( 'p1', 'P1' ),
		paragraph( 'p2', 'P2' ),
		paragraph( 'p3', 'P3 (delete this)' ),
	];

	applyPostChangesWithBase(
		doc,
		{ blocks: baseBlocks },
		defaultSyncedProperties
	);

	// User B's delete has reached the CRDT document, but User A's
	// onRecordUpdate has not applied it to the edited entity yet.
	applyPostChangesWithBase(
		doc,
		{
			blocks: [ paragraph( 'p1', 'P1' ), paragraph( 'p2', 'P2' ) ],
		},
		defaultSyncedProperties,
		{ baseRecord: { blocks: baseBlocks } }
	);

	expect( getBlockContents() ).toEqual( [ 'P1', 'P2' ] );

	// User A now edits P1 while still holding stale local blocks that
	// include P3. The stale P3 must not be reintroduced.
	applyPostChangesWithBase(
		doc,
		{
			blocks: [
				paragraph( 'p1', 'P1 - User A makes local changes' ),
				paragraph( 'p2', 'P2' ),
				paragraph( 'p3', 'P3 (delete this)' ),
			],
		},
		defaultSyncedProperties,
		{ baseRecord: { blocks: baseBlocks } }
	);

	expect( getBlockContents() ).toEqual( [
		'P1 - User A makes local changes',
		'P2',
	] );
} );
```

## Schedule

The test uses ordinary `core/paragraph` blocks and no custom block types.

1. Initialize the CRDT document from a shared base containing three blocks:
   `P1`, `P2`, and `P3`.
2. Apply User B's observed delete of `P3`, passing the original base record.
   The CRDT now contains only `P1` and `P2`.
3. Model the delayed `onRecordUpdate()` window for User A: User A's local
   edited entity is still stale and still contains `P3`.
4. Apply User A's natural edit to `P1`, again passing the same base record.
5. Assert that the final CRDT contents are `P1 - User A makes local changes`
   and `P2`; `P3` must not be resurrected.

## Why this is deterministic

The browser/WebSocket version of this bug depends on a narrow ordering between
incoming CRDT updates, `onRecordUpdate()`, and a user's next local block edit.
This focused harness constructs that ordering directly at the post CRDT
boundary:

-   the remote delete is represented by applying `[ P1, P2 ]` to the CRDT;
-   the delayed local entity is represented by applying `[ P1 edited, P2, P3 ]`
    afterward;
-   `baseRecord` preserves the pre-change block snapshot shared by both updates.

That makes the repro independent of wall-clock sleeps, network timing, browser
visibility, WebSocket delivery timing, or editor UI focus.

## Expected results

On trunk, the final assertion fails because the stale local block list
reintroduces `P3`:

```text
Expected: [ "P1 - User A makes local changes", "P2" ]
Received: [ "P1 - User A makes local changes", "P2", "P3 (delete this)" ]
```

On the updated PR branch rebased against trunk, the same test passes. The
base-aware merge can identify that `P3` existed in the base, is missing from the
current CRDT document, and only appears in the incoming update because User A's
local entity is stale.

## Validation command

Run the targeted test from `test/unit`:

```bash
../../node_modules/.bin/wp-scripts test-unit-js --config jest.config.js --runInBand --testNamePattern="does not resurrect a remotely deleted block from a delayed onRecordUpdate stale local edit" packages/core-data/src/utils/test/crdt.ts
```

The repro was validated twice on current trunk and twice on the rebased PR
branch:

-   trunk `195eff9c78b535ddc543dc355fb3359e2fea7da8`: failed twice with
    resurrected `P3`.
-   PR branch rebased onto that trunk, local validation HEAD
    `bd69aad03086fec3102d9758a1a63d45ea0e6cdb`: passed twice.
