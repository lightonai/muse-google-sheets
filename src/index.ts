import {
	gettingStarted,
	privacyPolicy,
	registerApiKey,
	selectModel,
	toggleStagingUrl,
} from './settings.js';
import { completeCells } from './completeCells.js';

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
		.addSubMenu(
			ui
				.createMenu('Help')
				.addItem('Getting started!', gettingStarted.name)
				.addItem('Privacy Policy', privacyPolicy.name)
		)
		.addToUi();

	// Expose this function for LightOn internal use
	toggleStagingUrl.name;
}

// Store the API key
export const API_KEY_PROP = 'muse-api-key';

// Store the current selected model
export const API_MODEL_PROP = 'muse-api-model';

// Store which Api URL to use (staging or production)
export const USE_STAGING_URL_PROP = 'muse-use-staging-url';
