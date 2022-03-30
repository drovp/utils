const {ipcRenderer, shell, clipboard} = require('electron');

/**
 * Resolves with current modal's window context.
 * Context contains payload the window was spawned with, as well as potential processor dependencies.
 */
export function getContext<P = unknown, D = {[key: string]: unknown}>(): Promise<{payload: P; dependencies: D}> {
	return ipcRenderer.invoke('get-modal-window-context');
}

/**
 * Resolves the modal window with a payload.
 * This also immediately closes the window.
 */
export function resolve(payload: unknown) {
	ipcRenderer.invoke('resolve-modal-window', payload);
}

/**
 * Open context menu which resolves with `void` when closed and the clicked
 * item's handler executed.
 */
export async function openContextMenu(items?: MenuItemConstructorOptions[]) {
	// Remove functions and other non-serializable data from items
	const serializableItems = items ? JSON.parse(JSON.stringify(items)) : undefined;
	const path = await ipcRenderer.invoke('open-context-menu', serializableItems);

	// Menu closed without any item clicked
	if (!Array.isArray(path)) return;

	// I don't have a patience to type this atm, so `any` it is
	let walker: any = items;
	for (let i = 0; i < path.length; i++) {
		const index = path[i]!;
		if (Array.isArray(walker)) {
			const item = walker[index];
			if (item) walker = i < path.length - 1 ? item.submenu : item.click;
		} else {
			walker = undefined;
		}
	}

	if (typeof walker === 'function') {
		walker();
	} else {
		throw new Error(`Invalid context menu item click handler.`);
	}
}

/**
 * Generic global context menus.
 */
window.addEventListener('contextmenu', (event) => {
	if (event.defaultPrevented) return;

	event.preventDefault();
	event.stopPropagation();

	if (!(event?.target instanceof HTMLElement)) return;

	// Text selection
	const selection = window.getSelection()?.toString();
	if (selection && selection.length > 0) {
		openContextMenu([{role: 'copy'}, {type: 'separator'}, {role: 'selectAll'}]);
		return;
	}

	// Disable completely on some elements
	if (event.target.closest('select')) {
		openContextMenu();
		return;
	}

	// Inputs & Text areas
	const editableInput = event.target.closest('input:not([read-only]),textarea:not([read-only])');
	if (editableInput) {
		openContextMenu([
			{role: 'undo'},
			{role: 'redo'},
			{type: 'separator'},
			{role: 'cut'},
			{role: 'copy'},
			{role: 'paste'},
			{type: 'separator'},
			{role: 'selectAll'},
		]);
		return;
	}

	// Anchor links
	const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
	if (anchor) {
		const href = anchor.href;
		if (href) {
			openContextMenu([
				{label: 'Open', click: () => shell.openExternal(href)},
				{label: 'Copy', click: () => clipboard.writeText(href)},
			]);
		}
		return;
	}

	// Generic app context menu with quick tools
	openContextMenu();
});

export interface MenuItemConstructorOptions {
	/**
	 * Will be called with `click()` when the menu item is clicked.
	 */
	click?: () => void;
	// prettier-ignore
	/**
	 * Can be `undo`, `redo`, `cut`, `copy`, `paste`, `pasteAndMatchStyle`, `delete`,
	 * `selectAll`, `reload`, `forceReload`, `toggleDevTools`, `resetZoom`, `zoomIn`,
	 * `zoomOut`, `toggleSpellChecker`, `togglefullscreen`, `window`, `minimize`,
	 * `close`, `help`, `about`, `services`, `hide`, `hideOthers`, `unhide`, `quit`,
	 * `startSpeaking`, `stopSpeaking`, `zoom`, `front`, `appMenu`, `fileMenu`,
	 * `editMenu`, `viewMenu`, `shareMenu`, `recentDocuments`, `toggleTabBar`,
	 * `selectNextTab`, `selectPreviousTab`, `mergeAllWindows`, `clearRecentDocuments`,
	 * `moveTabToNewWindow` or `windowMenu` - Define the action of the menu item, when
	 * specified the `click` property will be ignored. See roles.
	 */
	role?: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'pasteAndMatchStyle' | 'delete' | 'selectAll' | 'reload'
		| 'forceReload' | 'toggleDevTools' | 'resetZoom' | 'zoomIn' | 'zoomOut' | 'toggleSpellChecker'
		| 'togglefullscreen' | 'window' | 'minimize' | 'close' | 'help' | 'about' | 'services' | 'hide' | 'hideOthers'
		| 'unhide' | 'quit' | 'startSpeaking' | 'stopSpeaking' | 'zoom' | 'front' | 'appMenu' | 'fileMenu' | 'editMenu'
		| 'viewMenu' | 'shareMenu' | 'recentDocuments' | 'toggleTabBar' | 'selectNextTab' | 'selectPreviousTab'
		| 'mergeAllWindows' | 'clearRecentDocuments' | 'moveTabToNewWindow' | 'windowMenu';
	/**
	 * Can be `normal`, `separator`, `submenu`, `checkbox` or `radio`.
	 */
	type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
	label?: string;
	sublabel?: string;
	/**
	 * Hover text for this menu item.
	 *
	 * @platform darwin
	 */
	toolTip?: string;
	accelerator?: string;
	icon?: string;
	/**
	 * If false, the menu item will be greyed out and unclickable.
	 */
	enabled?: boolean;
	/**
	 * default is `true`, and when `false` will prevent the accelerator from triggering
	 * the item if the item is not visible`.
	 *
	 * @platform darwin
	 */
	acceleratorWorksWhenHidden?: boolean;
	/**
	 * If false, the menu item will be entirely hidden.
	 */
	visible?: boolean;
	/**
	 * Should only be specified for `checkbox` or `radio` type menu items.
	 */
	checked?: boolean;
	/**
	 * If false, the accelerator won't be registered with the system, but it will still
	 * be displayed. Defaults to true.
	 *
	 * @platform linux,win32
	 */
	registerAccelerator?: boolean;
	/**
	 * The item to share when the `role` is `shareMenu`.
	 *
	 * @platform darwin
	 */
	sharingItem?: SharingItem;
	/**
	 * Should be specified for `submenu` type menu items. If `submenu` is specified,
	 * the `type: 'submenu'` can be omitted. If the value is not a `Menu` then it will
	 * be automatically converted to one using `Menu.buildFromTemplate`.
	 */
	submenu?: MenuItemConstructorOptions[];
	/**
	 * Unique within a single menu. If defined then it can be used as a reference to
	 * this item by the position attribute.
	 */
	id?: string;
	/**
	 * Inserts this item before the item with the specified label. If the referenced
	 * item doesn't exist the item will be inserted at the end of  the menu. Also
	 * implies that the menu item in question should be placed in the same “group” as
	 * the item.
	 */
	before?: string[];
	/**
	 * Inserts this item after the item with the specified label. If the referenced
	 * item doesn't exist the item will be inserted at the end of the menu.
	 */
	after?: string[];
	/**
	 * Provides a means for a single context menu to declare the placement of their
	 * containing group before the containing group of the item with the specified
	 * label.
	 */
	beforeGroupContaining?: string[];
	/**
	 * Provides a means for a single context menu to declare the placement of their
	 * containing group after the containing group of the item with the specified
	 * label.
	 */
	afterGroupContaining?: string[];
}

export interface SharingItem {
	// Docs: https://electronjs.org/docs/api/structures/sharing-item

	/**
	 * An array of files to share.
	 */
	filePaths?: string[];
	/**
	 * An array of text to share.
	 */
	texts?: string[];
	/**
	 * An array of URLs to share.
	 */
	urls?: string[];
}
