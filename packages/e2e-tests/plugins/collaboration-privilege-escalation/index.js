( function () {
	const el = wp.element.createElement;
	const { TextControl } = wp.components;
	const { useDispatch, useSelect } = wp.data;
	const { PluginDocumentSettingPanel } = wp.editor;
	const editorStore = wp.editor.store || 'core/editor';
	const { registerPlugin } = wp.plugins;

	function PrivilegedMetaPanel() {
		const meta = useSelect(
			( select ) =>
				select( editorStore ).getEditedPostAttribute( 'meta' ) || {},
			[]
		);
		const { editPost } = useDispatch( editorStore );

		return el(
			PluginDocumentSettingPanel,
			{
				className: 'rtc-privilege-escalation-panel',
				name: 'rtc-privilege-escalation-panel',
				title: 'RTC privileged meta',
			},
			el( TextControl, {
				__next40pxDefaultSize: true,
				__nextHasNoMarginBottom: true,
				label: 'Privileged meta',
				onChange( nextValue ) {
					editPost( {
						meta: {
							...meta,
							rtc_privileged_meta: nextValue,
						},
					} );
				},
				value: meta.rtc_privileged_meta || '',
			} )
		);
	}

	registerPlugin( 'rtc-privilege-escalation-panel', {
		render: PrivilegedMetaPanel,
	} );
} )();
