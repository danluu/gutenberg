/**
 * WordPress dependencies
 */
import { type PostEditorAwarenessState } from '@wordpress/core-data';

function isObjectRecord( value: unknown ): value is Record< string, unknown > {
	return (
		'object' === typeof value && null !== value && ! Array.isArray( value )
	);
}

function isAvatarUrls( value: unknown ): value is Record< string, string > {
	if ( ! isObjectRecord( value ) ) {
		return false;
	}

	return Object.values( value ).every(
		( avatarUrl ) => 'string' === typeof avatarUrl
	);
}

function isSafeInteger( value: unknown ): value is number {
	return 'number' === typeof value && Number.isSafeInteger( value );
}

function isFiniteNumber( value: unknown ): value is number {
	return 'number' === typeof value && Number.isFinite( value );
}

export function hasRenderableCollaboratorInfo(
	collaboratorState: unknown
): collaboratorState is PostEditorAwarenessState {
	if ( ! isObjectRecord( collaboratorState ) ) {
		return false;
	}

	const collaboratorInfo = collaboratorState.collaboratorInfo;
	if ( ! isObjectRecord( collaboratorInfo ) ) {
		return false;
	}

	return (
		isSafeInteger( collaboratorState.clientId ) &&
		collaboratorState.clientId >= 0 &&
		'boolean' === typeof collaboratorState.isConnected &&
		'boolean' === typeof collaboratorState.isMe &&
		isSafeInteger( collaboratorInfo.id ) &&
		collaboratorInfo.id > 0 &&
		'string' === typeof collaboratorInfo.name &&
		'string' === typeof collaboratorInfo.slug &&
		isAvatarUrls( collaboratorInfo.avatar_urls ) &&
		'string' === typeof collaboratorInfo.browserType &&
		isFiniteNumber( collaboratorInfo.enteredAt )
	);
}
