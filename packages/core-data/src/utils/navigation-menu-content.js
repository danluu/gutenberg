function rawContent( content ) {
	if ( ! content ) {
		return '';
	}

	return typeof content === 'string'
		? content
		: content.raw ?? content.rendered ?? '';
}

function getTopLevelBlockFragments( content ) {
	const fragments = [];
	const blockComment = /<!--\s+(\/)?wp:[\s\S]*?-->/g;
	let depth = 0;
	let start = null;
	let match;

	while ( ( match = blockComment.exec( content ) ) ) {
		const isClosing = !! match[ 1 ];
		const isSelfClosing = /\/\s*-->$/.test( match[ 0 ] );
		const end = match.index + match[ 0 ].length;

		if ( isClosing ) {
			if ( depth > 0 ) {
				depth--;
			}
			if ( depth === 0 && start !== null ) {
				fragments.push( content.slice( start, end ).trim() );
				start = null;
			}
			continue;
		}

		if ( depth === 0 ) {
			start = match.index;
		}

		if ( isSelfClosing ) {
			if ( depth === 0 && start !== null ) {
				fragments.push( content.slice( start, end ).trim() );
				start = null;
			}
		} else {
			depth++;
		}
	}

	return fragments;
}

/**
 * Merge additions from a stale Navigation Menu edit into the latest saved
 * server content.
 *
 * This is intentionally conservative. It preserves the latest server content
 * whenever the save is based on stale content, and only carries over top-level
 * blocks that are additions relative to the stale save's original base.
 *
 * @param {string|Object} baseContent   Content loaded by the stale editor.
 * @param {string|Object} editedContent Content the stale editor is trying to save.
 * @param {string|Object} latestContent Latest server content.
 * @return {string|undefined} Merged content, or undefined when no merge is needed.
 */
export function mergeStaleNavigationMenuContent(
	baseContent,
	editedContent,
	latestContent
) {
	const baseRaw = rawContent( baseContent );
	const editedRaw = rawContent( editedContent );
	const latestRaw = rawContent( latestContent );

	if (
		! latestRaw ||
		latestRaw === baseRaw ||
		latestRaw === editedRaw ||
		editedRaw === baseRaw
	) {
		return undefined;
	}

	const baseFragments = getTopLevelBlockFragments( baseRaw );
	const editedFragments = getTopLevelBlockFragments( editedRaw );
	const latestFragments = getTopLevelBlockFragments( latestRaw );

	if (
		! baseFragments.length ||
		! editedFragments.length ||
		! latestFragments.length ||
		editedFragments.length <= baseFragments.length
	) {
		return latestRaw;
	}

	const baseSignatures = new Set( baseFragments );
	const latestSignatures = new Set( latestFragments );
	const additions = editedFragments.filter( ( fragment ) => {
		return (
			! baseSignatures.has( fragment ) &&
			! latestSignatures.has( fragment )
		);
	} );

	if ( additions.length === 0 ) {
		return latestRaw;
	}

	return [ latestRaw.trim(), ...additions ].join( '\n\n' ).trim();
}
