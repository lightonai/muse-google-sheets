/* eslint-disable no-unused-expressions */

import {
	dropDownModal,
	registerApiKey,
	selectModel,
	toggleStagingUrl,
} from './settings.js';
import { completeCells } from './completeCells.js';

export function onInstall(event: GoogleAppsScript.Events.SheetsOnOpen) {
	onOpen(event);
}

export function onOpen(_event: GoogleAppsScript.Events.SheetsOnOpen) {
	const ui = SpreadsheetApp.getUi();

	ui.createMenu('Muse')
		.addItem('Complete Cells', completeCells.name)
		.addSubMenu(
			ui
				.createMenu('Settings')
				.addItem('Select Model', dropDownModal.name)
				.addItem('Register API Key', registerApiKey.name)
		)
		.addToUi();

	// Include this function for the dropdown template
	selectModel.name;
	toggleStagingUrl.name;
}

export const API_KEY_PROP = 'muse-api-key';
export const API_MODEL_PROP = 'muse-api-model';
export const USE_STAGING_URL_PROP = 'muse-use-staging-url';
