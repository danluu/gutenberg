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
		'number' === typeof collaboratorInfo.id &&
		'string' === typeof collaboratorInfo.name &&
		'string' === typeof collaboratorInfo.slug &&
		isAvatarUrls( collaboratorInfo.avatar_urls ) &&
		'string' === typeof collaboratorInfo.browserType &&
		'number' === typeof collaboratorInfo.enteredAt
	);
}
