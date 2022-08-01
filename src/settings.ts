import { API_KEY_PROP, API_MODEL_PROP, USE_STAGING_URL_PROP } from './index.js';
import { ApiModel, Endpoint } from 'lighton-muse';
import { MuseRequest } from './client.js';

export function registerApiKey() {
	const userProperties = PropertiesService.getUserProperties();

	const ui = SpreadsheetApp.getUi();

	const result = ui.prompt(
		'Please enter your Muse API Key for authentication purposes!',
		'Muse API Key:',
		ui.ButtonSet.OK
	);

	const button = result.getSelectedButton();
	const text = result.getResponseText();

	if (button === ui.Button.OK) {
		const request = new MuseRequest(text);

		const { error } = request.query(ApiModel.OrionFrV2, Endpoint.Tokenize, {
			text: 'Is this a valid API key?',
		});

		if (error) return ui.alert(`Something went wrong: ${error.message}`);

		ui.alert('You are all set!');

		userProperties.setProperty(API_KEY_PROP, text);
	} else if (button === ui.Button.CLOSE) {
		ui.alert('You must set your API key in order to use Muse.');
	}
}

// IDEA: replace this with a cell with data validation
export function dropDownModal() {
	const ui = SpreadsheetApp.getUi();
	const dialog = HtmlService.createHtmlOutputFromFile('templates/dropdown')
		.setSandboxMode(HtmlService.SandboxMode.IFRAME)
		.setWidth(350)
		.setHeight(100);

	ui.showModalDialog(dialog, 'Select Model');
}

export function selectModel(model: ApiModel) {
	const userProperties = PropertiesService.getUserProperties();

	userProperties.setProperty(API_MODEL_PROP, model);
}

export function toggleStagingUrl() {
	const userProperties = PropertiesService.getUserProperties();
	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

	if (userProperties.getProperty(USE_STAGING_URL_PROP)) {
		userProperties.deleteProperty(USE_STAGING_URL_PROP);

		spreadsheet.toast('Now using production URL.');
	} else {
		userProperties.setProperty(USE_STAGING_URL_PROP, 'true');

		spreadsheet.toast('Now using staging URL.');
	}
}

export function gettingStarted() {
	const ui = SpreadsheetApp.getUi();
	const dialog = HtmlService.createHtmlOutputFromFile(
		'templates/getting-started'
	)
		.setSandboxMode(HtmlService.SandboxMode.IFRAME)
		.setWidth(600)
		.setHeight(50);

	ui.showModalDialog(dialog, 'Getting started!');
}
