import {
	ApiBatchRequestOptions,
	ApiModels,
	Endpoints,
	ApiRequestOptions,
	ApiCreateParams,
} from 'lighton-muse';
import { API_KEY_PROP } from './index.js';
import { MuseRequest } from './client.js';

export function completeCells() {
	let begin = new Date();

	const userProperties = PropertiesService.getUserProperties();
	const apiKey = userProperties.getProperty(API_KEY_PROP);

	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
	const range = spreadsheet.getActiveRange();

	if (!apiKey) {
		return spreadsheet.toast(
			'You must set your API key in order to use Muse.',
			'Error!'
		);
	}

	if (!range) return spreadsheet.toast('You did not select a range.');

	if (!(range.getNumColumns() > 1 && range.getNumRows() > 1)) {
		return spreadsheet.toast(
			'You need to select a range with more than one column and one row.',
			'Error!'
		);
	}

	let req: ApiBatchRequestOptions<Endpoints.Create> = [];

	let [firstRow, ...rows] = range.getValues();

	let validation = _validateFirstRow(firstRow);

	if (validation.error) {
		return spreadsheet.toast(validation.error, 'Error!');
	}

	for (let row of rows) {
		let _completion = row.pop();
		let [prompt, ...values] = row;

		let reqPart: ApiRequestOptions<Endpoints.Create> = {
			text: prompt,
		};

		reqPart = _addParameters(
			reqPart,
			validation.params as string[],
			values
		);

		Logger.log(reqPart);

		req.push(reqPart);
	}

	let response = new MuseRequest(apiKey).query(
		ApiModels.OrionFr,
		Endpoints.Create,
		req
	);

	if (response.error) {
		return spreadsheet.toast(response.error.message, 'Error!');
	}

	for (let index = 0; index < response.response.outputs.length; index++) {
		const output =
			response.response.outputs[index][0].completions[0].output_text;

		range.getCell(index + 2, range.getNumColumns()).setValue(output);
	}

	spreadsheet.toast(
		`Done in ${(new Date().valueOf() - begin.valueOf()) / 1000}s`,
		'Done!'
	);
}

function _validateFirstRow(row: any[]):
	| {
			params: null;
			error: string;
	  }
	| {
			params: string[];
			error: null;
	  } {
	let _completion = row.pop();
	let [prompt, ...rest] = row;

	if (typeof prompt !== 'string') {
		return { error: `Prompt is not a string: ${prompt}`, params: null };
	}

	for (let param of rest) {
		if (typeof param !== 'string') {
			return { error: `Invalid parameter type: ${param}`, params: null };
		}

		if (
			!USER_ALLOWED_REQUEST_OPTIONS.includes(param) &&
			!USER_ALLOWED_REQUEST_PARAMS.includes(param)
		) {
			return {
				error: `Parameter does not exist: ${param || '<empty>'}`,
				params: null,
			};
		}
	}

	return { params: rest, error: null };
}

const USER_ALLOWED_REQUEST_OPTIONS = ['n_tokens', 'best_of'];
const USER_ALLOWED_REQUEST_PARAMS = [
	'mode',
	'temperature',
	'p',
	'k',
	'biases',
	'presence_penalty',
	'frequency_penalty',
	'stop_words',
	'concat_prompt',
	'seed',
	'skill',
];

function _addParameters(
	requestOptions: ApiRequestOptions<Endpoints.Create>,
	params: string[],
	values: any[]
): ApiRequestOptions<Endpoints.Create> {
	if (params.length !== values.length) {
		throw new Error('Parameters and values do not match.');
	}

	let parameters: ApiCreateParams = {
		concat_prompt: true,
	};
	for (let param of params) {
		// Remove empty values ('' or 0)
		let value = values.shift() || undefined;

		if (USER_ALLOWED_REQUEST_PARAMS.includes(param)) {
			// TODO: check value type match with param type

			Object.assign(parameters, { [param]: value });
		} else if (!USER_ALLOWED_REQUEST_OPTIONS.includes(param)) {
			// TODO: check value type match with param type

			Object.assign(requestOptions, { [param]: value });
		}

		Object.assign(requestOptions, { params: parameters });
	}

	return requestOptions;
}
