import { execFileSync } from 'node:child_process';

const parentCommit = 'aa5cc43e13c3ed59864dd2a042e7876b0b3b3d6c';
const introducingCommit = '7141ce69260848cbe9ec5a47f2c51bd078b98a2e';
const clientAssetsPath = 'lib/client-assets.php';
const editorEffectsPath = 'editor/store/effects.js';

function gitShow( rev, file ) {
	return execFileSync( 'git', [ 'show', `${ rev }:${ file }` ], {
		encoding: 'utf8',
	} );
}

function assert( condition, message ) {
	if ( ! condition ) {
		throw new Error( message );
	}
}

function extractFunction( phpSource, functionName ) {
	const start = phpSource.indexOf( `function ${ functionName }` );
	assert( start !== -1, `Could not find ${ functionName }` );

	let braceDepth = 0;
	let inFunction = false;
	for ( let index = start; index < phpSource.length; index++ ) {
		const char = phpSource[ index ];
		if ( char === '{' ) {
			braceDepth++;
			inFunction = true;
		} else if ( char === '}' ) {
			braceDepth--;
			if ( inFunction && braceDepth === 0 ) {
				return phpSource.slice( start, index + 1 );
			}
		}
	}

	throw new Error( `Could not extract ${ functionName }` );
}

const parentClientAssets = gitShow( parentCommit, clientAssetsPath );
const introducedClientAssets = gitShow( introducingCommit, clientAssetsPath );
const introducedEditorEffects = gitShow( introducingCommit, editorEffectsPath );

assert(
	! parentClientAssets.includes(
		'function get_autosave_newer_than_post_save'
	),
	'Parent commit unexpectedly contains get_autosave_newer_than_post_save().'
);
assert(
	! parentClientAssets.includes( "$editor_settings['autosave']" ),
	'Parent commit unexpectedly wires editorSettings.autosave.'
);
console.log(
	`PASS parent ${ parentCommit } has no newer-autosave helper and does not wire editorSettings.autosave.`
);

assert(
	introducedClientAssets.includes(
		'function get_autosave_newer_than_post_save'
	),
	'Introducing commit is missing get_autosave_newer_than_post_save().'
);
assert(
	introducedClientAssets.includes( "$editor_settings['autosave']" ),
	'Introducing commit is missing editorSettings.autosave wiring.'
);
assert(
	introducedEditorEffects.includes(
		'There is an autosave of this post that is more recent than the version below.'
	),
	'Introducing commit is missing the newer-autosave notice.'
);
assert(
	introducedEditorEffects.includes( 'View the autosave' ),
	'Introducing commit is missing the autosave revision link.'
);
console.log(
	`PASS commit ${ introducingCommit } adds the helper, editor setting, notice, and link.`
);

const helperFunction = extractFunction(
	introducedClientAssets,
	'get_autosave_newer_than_post_save'
);

const phpProgram = `class Mock_Post {
\tpublic $ID;
\tpublic $post_modified_gmt;
\tpublic $post_title;
\tpublic $post_content;
\tpublic $post_excerpt;

\tpublic function __construct( $props ) {
\t\tforeach ( $props as $key => $value ) {
\t\t\t$this->$key = $value;
\t\t}
\t}
}

$deleted_revisions = array();
$mock_autosave = new Mock_Post(
\tarray(
\t\t'ID' => 200,
\t\t'post_modified_gmt' => '2026-06-26 00:01:00',
\t\t'post_title' => 'same title',
\t\t'post_content' => 'same content',
\t\t'post_excerpt' => 'same excerpt',
\t)
);

function wp_get_post_autosave( $post_id ) {
\tglobal $mock_autosave;
\treturn $mock_autosave;
}

function mysql2date( $format, $date, $translate = false ) {
\treturn strtotime( $date );
}

function wp_delete_post_revision( $revision_id ) {
\tglobal $deleted_revisions;
\t$deleted_revisions[] = $revision_id;
\treturn true;
}

${ helperFunction }

$post = new Mock_Post(
\tarray(
\t\t'ID' => 100,
\t\t'post_modified_gmt' => '2026-06-26 00:00:00',
\t\t'post_title' => 'same title',
\t\t'post_content' => 'same content',
\t\t'post_excerpt' => 'same excerpt',
\t)
);

$result = get_autosave_newer_than_post_save( $post );
if ( ! $result || 200 !== $result->ID ) {
\tfwrite( STDERR, "Expected same-content newer autosave to be returned.\\n" );
\texit( 1 );
}
if ( $deleted_revisions ) {
\tfwrite( STDERR, "Newer autosave should not be deleted.\\n" );
\texit( 1 );
}

$mock_autosave->post_modified_gmt = '2026-06-25 23:59:00';
$result = get_autosave_newer_than_post_save( $post );
if ( false !== $result ) {
\tfwrite( STDERR, "Expected older autosave to be rejected.\\n" );
\texit( 1 );
}
if ( array( 200 ) !== $deleted_revisions ) {
\tfwrite( STDERR, "Expected older autosave revision to be deleted.\\n" );
\texit( 1 );
}
`;

execFileSync( 'php', [ '-r', phpProgram ], { stdio: 'inherit' } );
console.log(
	'PASS introduced helper returns a same-content autosave solely because it is newer, and rejects an older one.'
);
