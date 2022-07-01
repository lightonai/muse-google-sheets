import {
	ApiBatchRequestOptions,
	ApiModels,
	Endpoints,
	ApiCreateOptions,
	ApiRequestOptions,
	ApiCreateParams,
	ApiModes,
} from 'lighton-muse';
import { API_KEY_PROP, API_MODEL_PROP } from './index.js';
import { MuseRequest } from './client.js';

type RecordTypes<K> = {
	[P in keyof K]: K[P] extends string
		? 'string'
		: K[P] extends boolean
		? 'boolean'
		: K[P] extends number
		? 'number'
		: K[P] extends string[]
		? 'string'
		: never;
};

// TODO: handle more parameters
type UserAllowedRequestParams = Omit<
	Required<ApiCreateParams>,
	'n_completions' | 'biases' | 'return_logprobs'
>;
const USER_ALLOWED_REQUEST_PARAMS: RecordTypes<UserAllowedRequestParams> = {
	n_tokens: 'number',
	best_of: 'number',
	// TODO: Handle special case
	mode: 'string',
	temperature: 'number',
	p: 'number',
	k: 'number',
	presence_penalty: 'number',
	frequency_penalty: 'number',
	// Special case handled lower (split string on `;`)
	stop_words: 'string',
	concat_prompt: 'boolean',
	seed: 'number',
	skill: 'string',
};

const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

const isUserAllowedRequestParamKey = (
	key: string
): key is keyof UserAllowedRequestParams =>
	typeof USER_ALLOWED_REQUEST_PARAMS[
		key as keyof UserAllowedRequestParams
	] !== 'undefined';

const isUserAllowedRequestParam = (
	key: keyof UserAllowedRequestParams,
	value: unknown
): key is keyof UserAllowedRequestParams => {
	if (typeof value === USER_ALLOWED_REQUEST_PARAMS[key]) {
		// If the mode param is not a valid model, return false
		if (
			key === 'mode' &&
			!Object.values(ApiModes).includes(value as ApiModes)
		) {
			spreadsheet.toast(
				`Invalid parameter type: ${key} must be one of ${Object.values(
					ApiModes
				).join(' / ')}`
			);

			return false;
		}

		return true;
	}

	spreadsheet.toast(
		`Invalid parameter type: ${key} must be of type "${
			USER_ALLOWED_REQUEST_PARAMS[key]
		}" and is type "${typeof value}"`
	);

	return false;
};

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

	let batchRequest: ApiBatchRequestOptions<Endpoints.Create> = [];

	let [firstRow, ...rows] = range.getValues();

	let { error: rowValidationError, params } = _validateFirstRow(firstRow);

	if (rowValidationError)
		return spreadsheet.toast(rowValidationError, 'Error!');
	if (!params) throw new Error('Undefined behavior');

	for (let row of rows) {
		let [prompt, ...values] = row.slice(0, -1);

		let request = _createRequestOptions(prompt, params, values);

		batchRequest.push(request);
	}

	let { error, response } = new MuseRequest(apiKey).query(
		userProperties.getProperty(API_MODEL_PROP) as ApiModels,
		Endpoints.Create,
		batchRequest
	);

	if (error) throw error;
	if (!response) throw new Error('Unreachable');

	Logger.log(response);

	for (let index = 0; index < response.outputs.length; index++) {
		const output = response.outputs[index][0].completions[0].output_text;

		// Cells coordinates are 1-indexed
		range.getCell(index + 2, range.getNumColumns()).setValue(output);
	}

	spreadsheet.toast(
		`Done in ${(new Date().valueOf() - begin.valueOf()) / 1000}s`,
		'Done!'
	);
}

function _validateFirstRow(row: any[]): {
	params?: (keyof UserAllowedRequestParams)[];
	error?: string;
} {
	// Omit the first and last columns (prompt and completion)
	const parameters = row.slice(1, -1);

	for (let param of parameters) {
		// Verify that the parameter is a valid string
		if (typeof param !== 'string') {
			return { error: `Invalid parameter type: ${param}` };
		}

		// Validate the parameter name
		if (!isUserAllowedRequestParamKey(param)) {
			return {
				error: `Parameter does not exist: ${param || '<empty>'}`,
			};
		}
	}

	return { params: parameters };
}

function _createRequestOptions(
	text: string,
	parameters: (keyof UserAllowedRequestParams)[],
	values: any[]
): ApiRequestOptions<Endpoints.Create> {
	if (parameters.length !== values.length) {
		throw new Error('Parameters and values do not match.');
	}

	const params: ApiCreateParams = {};

	for (let param of parameters) {
		let value = values.shift();

		// Skip empty parameters
		if (value === '') continue;

		// Add the parameter to the request
		// TODO: cleanup this shit
		if (!isUserAllowedRequestParam(param, value))
			throw new Error('Reachable');

		// Special case for `stop_words`
		if (param === 'stop_words') {
			value = value.split(';');
		}

		params[param] = value;
	}

	Logger.log(params);

	return { text, params };
}
