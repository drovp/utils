import {
	MenuItemConstructorOptions,
	OpenDialogOptions,
	OpenDialogReturnValue,
	SaveDialogOptions,
	SaveDialogReturnValue,
} from '@drovp/types';
const {ipcRenderer, shell, clipboard} = require('electron');

/**
 * Resolves with current modal's window payload.
 */
export function getPayload<Payload = unknown>(): Promise<Payload> {
	return ipcRenderer.invoke('get-modal-window-payload');
}

/**
 * Resolves the modal window with a payload.
 * This also immediately closes the window.
 */
export function resolve(payload: unknown) {
	ipcRenderer.invoke('resolve-modal-window', payload);
}

/**
 * Electron's open file dialog.
 */
export function showOpenDialog(options: OpenDialogOptions) {
	return ipcRenderer.invoke('show-open-dialog', options) as Promise<OpenDialogReturnValue>;
}

/**
 * Electron's save file dialog.
 */
export function showSaveDialog(options: SaveDialogOptions) {
	return ipcRenderer.invoke('show-save-dialog', options) as Promise<SaveDialogReturnValue>;
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
