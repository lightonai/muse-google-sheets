import {
	ApiBatchRequestOptions,
	ApiModels,
	Endpoints,
	ApiCreateOptions,
	ApiRequestOptions,
	ApiCreateParams,
} from 'lighton-muse';
import { API_KEY_PROP, API_MODEL_PROP } from './index.js';
import { MuseRequest } from './client.js';

type RecordTypes<K> = {
	[P in keyof K]: K[P] extends infer T | undefined
		? T extends string
			? 'string'
			: T extends boolean
			? 'boolean'
			: T extends number
			? 'number'
			: T extends string[]
			? 'string'
			: never
		: never;
};

type UserAllowedRequestOptions = Pick<ApiCreateOptions, 'n_tokens' | 'best_of'>;
const USER_ALLOWED_REQUEST_OPTIONS: RecordTypes<UserAllowedRequestOptions> = {
	n_tokens: 'number',
	best_of: 'number',
};

type UserAllowedRequestParams = Pick<
	ApiCreateParams,
	| 'mode'
	| 'temperature'
	| 'p'
	| 'k'
	| 'biases'
	| 'presence_penalty'
	| 'frequency_penalty'
	| 'stop_words'
	| 'concat_prompt'
	| 'seed'
	| 'skill'
>;
const USER_ALLOWED_REQUEST_PARAMS: RecordTypes<UserAllowedRequestParams> = {
	mode: 'string',
	temperature: 'number',
	p: 'number',
	k: 'number',
	presence_penalty: 'number',
	frequency_penalty: 'number',
	// TODO: handle special case with `;` (string[])
	stop_words: 'string',
	concat_prompt: 'boolean',
	seed: 'number',
	skill: 'string',
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

		Logger.log(request);
		batchRequest.push(request);
	}

	let { error, response } = new MuseRequest(apiKey).query(
		userProperties.getProperty(API_MODEL_PROP) as ApiModels,
		Endpoints.Create,
		batchRequest
	);

	if (error) {
		Logger.log(error);

		return spreadsheet.toast(error.message, 'Error!');
	}
	if (!response) throw new Error('Undefined behavior');

	for (let index = 0; index < response.outputs.length; index++) {
		const output = response.outputs[index][0].completions[0].output_text;

		range.getCell(index + 2, range.getNumColumns()).setValue(output);
	}

	spreadsheet.toast(
		`Done in ${(new Date().valueOf() - begin.valueOf()) / 1000}s`,
		'Done!'
	);
}

function _validateFirstRow(row: any[]): {
	params?: string[];
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
		if (
			!Object.keys(USER_ALLOWED_REQUEST_OPTIONS).includes(param) &&
			!Object.keys(USER_ALLOWED_REQUEST_PARAMS).includes(param)
		) {
			return {
				error: `Parameter does not exist: ${param || '<empty>'}`,
			};
		}
	}

	return { params: parameters };
}

function _createRequestOptions(
	text: string,
	params: string[],
	values: any[]
): ApiRequestOptions<Endpoints.Create> {
	if (params.length !== values.length) {
		throw new Error('Parameters and values do not match.');
	}

	const requestOptions: ApiCreateOptions = {
		text,
		params: {
			concat_prompt: true,
		},
	};

	for (let param of params) {
		const value = values.shift();

		// Skip empty parameters
		if (value === '') continue;

		// Add the parameter to the request
		if (Object.keys(USER_ALLOWED_REQUEST_PARAMS).includes(param)) {
			if (
				typeof param !==
				USER_ALLOWED_REQUEST_PARAMS[
					param as keyof UserAllowedRequestParams
				]
			) {
				// TODO: handle error
				continue;
			}

			Object.assign(requestOptions.params as ApiCreateParams, {
				[param]: value,
			});
		} else if (Object.keys(USER_ALLOWED_REQUEST_OPTIONS).includes(param)) {
			if (
				typeof param !==
				USER_ALLOWED_REQUEST_OPTIONS[
					param as keyof UserAllowedRequestOptions
				]
			) {
				// TODO: handle error
				continue;
			}

			Object.assign(requestOptions, { [param]: value });
		}
	}

	return requestOptions;
}
