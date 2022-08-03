import { ApiModel, Endpoint } from 'lighton-muse';
import {
	SHEET_META_API_MODEL,
	USER_PROP_API_KEY,
	USER_PROP_USE_STAGING_URL,
} from './index.js';
import { MuseRequest } from './client.js';

export function registerApiKey() {
	const ui = SpreadsheetApp.getUi();

	const dialog = HtmlService.createTemplateFromFile('templates/register-key')
		.evaluate()
		.setWidth(500)
		.setHeight(100);

	ui.showModalDialog(dialog, 'Register your API key');

	// Include this function for the template
	innerRegisterApiKey.name;
}

export function innerRegisterApiKey(key: string) {
	const userProperties = PropertiesService.getUserProperties();
	const ui = SpreadsheetApp.getUi();

	if (!key) {
		ui.alert('You must set your API key in order to use Muse.');
	}

	const request = new MuseRequest(key);

	const { error } = request.query(ApiModel.OrionFr, Endpoint.Tokenize, {
		text: 'Is this a valid API key?',
	});

	if (error) {
		if (error.message === 'Invalid api key') {
			return ui.alert('Your API key is invalid.');
		}

		return ui.alert(error.toString());
	}

	ui.alert('You are all set!');

	userProperties.setProperty(USER_PROP_API_KEY, key);
}

// IDEA: replace this with a cell with data validation
export function selectModel() {
	const ui = SpreadsheetApp.getUi();
	const dialog = HtmlService.createTemplateFromFile(
		'templates/model-dropdown'
	)
		.evaluate()
		.setWidth(300)
		.setHeight(50);

	ui.showModalDialog(dialog, 'Select the model for this sheet');

	// Include this function for the template
	innerSelectModel.name;
}

export function innerSelectModel(model: ApiModel) {
	const sheet = SpreadsheetApp.getActiveSheet();

	sheet.addDeveloperMetadata(SHEET_META_API_MODEL, model);
}

export function toggleStagingUrl() {
	const userProperties = PropertiesService.getUserProperties();
	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

	if (userProperties.getProperty(USER_PROP_USE_STAGING_URL)) {
		userProperties.deleteProperty(USER_PROP_USE_STAGING_URL);

		spreadsheet.toast('Now using production URL.');
	} else {
		userProperties.setProperty(USER_PROP_USE_STAGING_URL, 'true');

		spreadsheet.toast('Now using staging URL.');
	}
}

export function help() {
	const ui = SpreadsheetApp.getUi();
	const dialog = HtmlService.createTemplateFromFile('templates/help')
		.evaluate()
		.setWidth(600)
		.setHeight(100);

	ui.showModalDialog(dialog, 'Help!');
}

export function checkMultipleAccountIssue(initiator: string) {
	const userEmailAddress = Session.getEffectiveUser().getEmail();

	/*
	 * Check if effective user matches the initiator (the account who triggered the display of the UI)
	 * Due to a Google bug, if user is connected with multiple accounts inside the same browser session
	 * google.script.run can be executed by another account than the initiator
	 */

	if (initiator !== userEmailAddress) {
		const message = `\
You are logged in with multiple accounts and this causes errors.
Log out with account ${userEmailAddress} if you want to continue with the account: ${initiator}`;

		throw new Error(message);
	}
}
