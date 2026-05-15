/**
 * Internal dependencies
 */
import createLocks from '../engine';

// We correctly await all promises with expect calls, but the rule doesn't detect that.
/* eslint-disable jest/valid-expect-in-promise */

describe( 'Locks engine', () => {
	it( 'does not grant two exclusive locks at once', async () => {
		const locks = createLocks();

		let l1Granted = false;
		let l2Granted = false;

		// Request two locks.
		const l1 = locks.acquire( 'store', [ 'root' ], true );
		const l2 = locks.acquire( 'store', [ 'root' ], true );

		// On each grant, verify that the other lock is not granted at the same time.
		const check1 = l1.then( () => {
			l1Granted = true;
			expect( l2Granted ).toBe( false );
		} );

		const check2 = l2.then( () => {
			l2Granted = true;
			expect( l1Granted ).toBe( false );
		} );

		// Unlock both.
		const lock1 = await l1;
		locks.release( lock1 );
		l1Granted = false;

		const lock2 = await l2;
		locks.release( lock2 );
		l2Granted = false;

		// Ensure that both locks were granted and checked.
		return await Promise.all( [ check1, check2 ] );
	} );

	it( 'does not grant an exclusive lock if a non-exclusive one already exists', async () => {
		const locks = createLocks();

		let l1Granted = false;
		let l2Granted = false;

		// Request two locks.
		const l1 = locks.acquire( 'store', [ 'root' ], false );
		const l2 = locks.acquire( 'store', [ 'root' ], true );

		// On each grant, verify that the other lock is not granted at the same time.
		const check1 = l1.then( () => {
			l1Granted = true;
			expect( l2Granted ).toBe( false );
		} );

		const check2 = l2.then( () => {
			l2Granted = true;
			expect( l1Granted ).toBe( false );
		} );

		// Unlock both.
		const lock1 = await l1;
		locks.release( lock1 );
		l1Granted = false;

		const lock2 = await l2;
		locks.release( lock2 );
		l2Granted = false;

		// Ensure that both locks were granted and checked.
		return await Promise.all( [ check1, check2 ] );
	} );

	it( 'does not grant two exclusive locks to parent and child', async () => {
		const locks = createLocks();

		let l1Granted = false;
		let l2Granted = false;

		// Request two locks.
		const l1 = locks.acquire( 'store', [ 'root' ], true );
		const l2 = locks.acquire( 'store', [ 'root', 'child' ], true );

		// On each grant, verify that the other lock is not granted at the same time.
		const check1 = l1.then( () => {
			l1Granted = true;
			expect( l2Granted ).toBe( false );
		} );

		const check2 = l2.then( () => {
			l2Granted = true;
			expect( l1Granted ).toBe( false );
		} );

		// Unlock both.
		const lock1 = await l1;
		locks.release( lock1 );
		l1Granted = false;

		const lock2 = await l2;
		locks.release( lock2 );
		l2Granted = false;

		// Ensure that both locks were granted and checked.
		return await Promise.all( [ check1, check2 ] );
	} );

	it( 'grants two non-exclusive locks at once', async () => {
		const locks = createLocks();

		const l1 = await locks.acquire( 'store', [ 'root' ], false );
		const l2 = await locks.acquire( 'store', [ 'root' ], false );

		expect( l1 ).not.toBeUndefined();
		expect( l2 ).not.toBeUndefined();
	} );

	it( 'does not grant a younger shared lock ahead of an older pending exclusive lock', async () => {
		const locks = createLocks();
		const granted = [];
		const path = [ 'root' ];

		const firstShared = await locks.acquire( 'store', path, false );
		const exclusivePromise = locks
			.acquire( 'store', path, true )
			.then( ( lock ) => {
				granted.push( 'exclusive' );
				return lock;
			} );
		const youngerSharedPromise = locks
			.acquire( 'store', path, false )
			.then( ( lock ) => {
				granted.push( 'younger-shared' );
				return lock;
			} );

		await Promise.resolve();
		expect( granted ).toEqual( [] );

		locks.release( firstShared );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'exclusive' ] );

		const exclusive = await exclusivePromise;
		locks.release( exclusive );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'exclusive', 'younger-shared' ] );

		locks.release( await youngerSharedPromise );
	} );

	it( 'does not grant a younger shared parent lock ahead of an older pending exclusive child lock', async () => {
		const locks = createLocks();
		const granted = [];
		const collectionPath = [ 'entities', 'records', 'postType', 'post' ];
		const recordPath = [ ...collectionPath, 123 ];

		const firstShared = await locks.acquire(
			'store',
			collectionPath,
			false
		);
		const exclusivePromise = locks
			.acquire( 'store', recordPath, true )
			.then( ( lock ) => {
				granted.push( 'exclusive-child' );
				return lock;
			} );
		const youngerSharedPromise = locks
			.acquire( 'store', collectionPath, false )
			.then( ( lock ) => {
				granted.push( 'younger-shared-parent' );
				return lock;
			} );

		await Promise.resolve();
		expect( granted ).toEqual( [] );

		locks.release( firstShared );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'exclusive-child' ] );

		const exclusive = await exclusivePromise;
		locks.release( exclusive );
		await Promise.resolve();
		expect( granted ).toEqual( [
			'exclusive-child',
			'younger-shared-parent',
		] );

		locks.release( await youngerSharedPromise );
	} );

	it( 'does not grant a younger shared lock ahead of an older pending exclusive lock with an equivalent string key', async () => {
		const locks = createLocks();
		const granted = [];
		const numericPath = [ 'entities', 'records', 'postType', 'post', 123 ];
		const stringPath = [ 'entities', 'records', 'postType', 'post', '123' ];

		const firstShared = await locks.acquire( 'store', numericPath, false );
		const exclusivePromise = locks
			.acquire( 'store', numericPath, true )
			.then( ( lock ) => {
				granted.push( 'exclusive' );
				return lock;
			} );
		const youngerSharedPromise = locks
			.acquire( 'store', stringPath, false )
			.then( ( lock ) => {
				granted.push( 'younger-shared' );
				return lock;
			} );

		await Promise.resolve();
		expect( granted ).toEqual( [] );

		locks.release( firstShared );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'exclusive' ] );

		const exclusive = await exclusivePromise;
		locks.release( exclusive );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'exclusive', 'younger-shared' ] );

		locks.release( await youngerSharedPromise );
	} );

	it( 'grants a younger non-conflicting shared lock while an older exclusive lock waits', async () => {
		const locks = createLocks();
		const granted = [];

		const firstShared = await locks.acquire( 'store', [ 'a' ], false );
		const exclusivePromise = locks
			.acquire( 'store', [ 'a' ], true )
			.then( ( lock ) => {
				granted.push( 'exclusive' );
				return lock;
			} );
		const nonConflictingSharedPromise = locks
			.acquire( 'store', [ 'b' ], false )
			.then( ( lock ) => {
				granted.push( 'non-conflicting-shared' );
				return lock;
			} );

		await Promise.resolve();
		expect( granted ).toEqual( [ 'non-conflicting-shared' ] );

		locks.release( await nonConflictingSharedPromise );
		expect( granted ).toEqual( [ 'non-conflicting-shared' ] );

		locks.release( firstShared );
		await Promise.resolve();
		expect( granted ).toEqual( [ 'non-conflicting-shared', 'exclusive' ] );

		locks.release( await exclusivePromise );
	} );

	it( 'grants two exclusive locks to different branches', async () => {
		const locks = createLocks();

		const l1 = await locks.acquire( 'store', [ 'a' ], true );
		const l2 = await locks.acquire( 'store', [ 'b' ], true );

		expect( l1 ).not.toBeUndefined();
		expect( l2 ).not.toBeUndefined();
	} );
} );

/* eslint-enable jest/valid-expect-in-promise */
