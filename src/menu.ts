import { MuseRequest } from './client.js';
import { Endpoints, ApiModels } from 'lighton-muse';

export async function registerApiKey() {
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

		let res = await req.query(ApiModels.OrionFrV2, Endpoints.Tokenize, {
			text: 'Is this a valid API key?',
		});

		if (!res.error) {
			ui.alert('You are all set!');
		} else {
			ui.alert(`Something went wrong: ${res.error.message}`);
		}
	} else if (button == ui.Button.CLOSE) {
		ui.alert('You must set your API key in order to use Muse.');
	}
}

export function completeCells() {
	let range = SpreadsheetApp.getActive().getActiveRange();

	Logger.log('You did not select a range.');

	if (!range) {
		return;
	}

	for (let x = 2; x < range.getNumColumns() + 1; x++) {
		let property_name = range.getCell(1, x).getValue();

		for (let y = 2; y < range.getNumRows() + 1; y++) {
			let entity_name = range.getCell(y, 1).getValue();
			let fill_cell = range.getCell(y, x);

			let result = '';

			fill_cell.setValue([result]);
		}
	}
}
