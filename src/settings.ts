import { MuseRequest } from './client.js';
import { Endpoints, ApiModels } from 'lighton-muse';
import { API_KEY_PROP, API_MODEL_PROP } from './index.js';

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

	if (button == ui.Button.OK) {
		let req = new MuseRequest(text);

		let res = req.query(ApiModels.OrionFrV2, Endpoints.Tokenize, {
			text: 'Is this a valid API key?',
		});

		if (!res.error) {
			ui.alert('You are all set!');

			userProperties.setProperty(API_KEY_PROP, text);
		} else {
			ui.alert(`Something went wrong: ${res.error.message}`);
		}
	} else if (button == ui.Button.CLOSE) {
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

export function selectModel(model: ApiModels) {
	const userProperties = PropertiesService.getUserProperties();

	userProperties.setProperty(API_MODEL_PROP, model);
}
