import { completeCells, registerApiKey } from './menu.js';

export function onInstall(event: GoogleAppsScript.Events.SheetsOnOpen) {
	onOpen(event);
}

export function onOpen(event: GoogleAppsScript.Events.SheetsOnOpen) {
	const ui = SpreadsheetApp.getUi();

	ui.createMenu('Muse')
		.addItem('Register API Key', registerApiKey.name)
		.addItem('Complete Cells', completeCells.name)
		.addToUi();
}
