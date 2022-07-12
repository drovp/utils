# @drovp/utils

Various utilities for developing [Drovp](https://drovp.app) plugins.

## Install

```
npm install @drovp/utils
```

## Usage

Utilities are split into namespaces they are made for, therefore they need to be required/imported with `@drovp/utils/<namespace>`.

Example importing from `modal-window` namespace:

```js
const {foo} = require('@drovp/utils/modal-window');
```

## modal-window

Import with `@drovp/utils/modal-window`:

```ts
const {getPayload, resolve, openContextMenu} = require('@drovp/utils/modal-window');
```

Importing/requiring from this namespace has a side effect of automatically setting up context menus for basic text editing and stuff like Toggle devtools/Inspect element when development mode is enabled.

### getPayload

```ts
function getPayload<Payload>(): Promise<Payload>;
```

Retrieves the payload you've passed in when opening this modal window.

### resolve

```ts
function resolve(payload: unknown): void;
```

Resolves the current modal window with a payload to make available in your preparator. Example:

```ts
function operationPreparator(payload, utils) {
	const result = utils.openModalWindow('modal.html', payload);
	if (result.canceled) return null; // Cancels the operation
	return result.payload; // Proceeds the operation with new/modified payload
}
```

Window is closed immediately afterwords.

In case you want to just close the window, which will cause the modal result be `{canceled: true, payload: undefined}`, simply call `window.close()`.

### showOpenDialog

```ts
function showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>;
```

Electron's [showOpenDialog](https://www.electronjs.org/docs/latest/api/dialog).

### showSaveDialog

```ts
function showSaveDialog(options: SaveDialogOptions): Promise<OpenDialogReturnValue>;
```

Electron's [showSaveDialog](https://www.electronjs.org/docs/latest/api/dialog).

### openContextMenu

```ts
function openContextMenu(items: MenuItemConstructorOptions[]): Promise<void>;
```

Opens a context menu with `items` in it. `MenuItemConstructorOptions` is a plain object with [Electron's `MenuItem`](https://www.electronjs.org/docs/latest/api/menu-item) properties on it. Resolves with `void` when menu has been closed, and clicked item's handler executed.

Example:

```ts
await openContextMenu([
	{
		label: 'Foo',
		click: () => console.log('foo'),
	},
	{type: 'separator'},
	{
		type: 'submenu',
		label: 'Submenu',
		submenu: [
			{
				label: 'Bar',
				click: () => console.log('bar'),
			},
		],
	},
]);
```

When you're opening context menu from a `contextmenu` event listener, you have to prevent the default action otherwise it'll be taken over by the global context menus:

```ts
someElement.addEventListener('contextmenu', event => {
	event.preventDefault();
	contextMenu(...items);
})
```

When development mode is enabled, context menu items such as **Toggle devtools** and **Inspect element** are added automatically to every context menu.
