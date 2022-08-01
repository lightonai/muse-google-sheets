import { API_KEY_PROP, API_MODEL_PROP, USE_STAGING_URL_PROP } from './index.js';
import { ApiModel, Endpoint } from 'lighton-muse';
import { MuseRequest } from './client.js';

export function registerApiKey() {
	const ui = SpreadsheetApp.getUi();

	const dialog = HtmlService.createHtmlOutputFromFile(
		'templates/register-key'
	)
		.setSandboxMode(HtmlService.SandboxMode.IFRAME)
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

	userProperties.setProperty(API_KEY_PROP, key);
}

// IDEA: replace this with a cell with data validation
export function selectModel() {
	const ui = SpreadsheetApp.getUi();
	const dialog = HtmlService.createHtmlOutputFromFile(
		'templates/model-dropdown'
	)
		.setSandboxMode(HtmlService.SandboxMode.IFRAME)
		.setWidth(350)
		.setHeight(100);

	ui.showModalDialog(dialog, 'Select the model');

	// Include this function for the template
	innerSelectModel.name;
}

export function innerSelectModel(model: ApiModel) {
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
