import {
	checkMultipleAccountIssue,
	help,
	registerApiKey,
	selectModel,
	toggleStagingUrl,
} from './settings.js';
import { SELECT } from './select.js';
import { completeCells } from './completeCells.js';
import { loadExampleSheet } from './example.js';

// Executed when the extension is installed
export function onInstall(event: GoogleAppsScript.Events.SheetsOnOpen) {
	onOpen(event);
}

// Executed when the extension is loaded (when the sheets loads)
export function onOpen(_event: GoogleAppsScript.Events.SheetsOnOpen) {
	const ui = SpreadsheetApp.getUi();

	ui.createMenu('Muse')
		.addItem('Complete cells', completeCells.name)
		.addSubMenu(
			ui
				.createMenu('Settings')
				.addItem('Select Model', selectModel.name)
				.addItem('Register API Key', registerApiKey.name)
		)
		.addItem('Help', help.name)
		.addItem('Load example sheet', loadExampleSheet.name)
		.addToUi();

	// Include function cells
	SELECT.name;
	// Expose this function for all templates
	checkMultipleAccountIssue.name;
	// Expose this function for LightOn internal use
	toggleStagingUrl.name;
}

// User property to store their API key
export const USER_PROP_API_KEY = 'muse-api-key';

// User property to store which API URL to use (staging or production)
export const USER_PROP_USE_STAGING_URL = 'muse-use-staging-url';

// Spreadsheet metadata to store the selected model
export const SHEET_META_API_MODEL = 'muse-api-model';
