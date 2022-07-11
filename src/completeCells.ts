import { API_KEY_PROP, API_MODEL_PROP } from './index.js';
import {
	ApiBatchRequestOptions,
	ApiCreateOptions,
	ApiCreateParams,
	ApiMode,
	ApiModel,
	Endpoint,
} from 'lighton-muse';
import { MuseRequest } from './client.js';

// IDEA: handle more parameters
type UserAllowedParameters = Omit<
	Required<ApiCreateParams>,
	'n_completions' | 'biases' | 'return_logprobs'
>;

type RecordTypes<T> = {
	[P in keyof T]: T[P] extends string
		? { type: 'string' }
		: T[P] extends boolean
		? { type: 'boolean' }
		: T[P] extends number
		? { type: 'number'; min: number; max: number }
		: T[P] extends string[]
		? { type: 'string' }
		: never;
};
const USER_ALLOWED_PARAMETERS: RecordTypes<UserAllowedParameters> = {
	n_tokens: { type: 'number', min: 1, max: 1023 },
	temperature: { type: 'number', min: 0, max: 10 },
	p: { type: 'number', min: 0, max: 1 },
	k: { type: 'number', min: 1, max: 512 },
	best_of: { type: 'number', min: 1, max: Number.MAX_SAFE_INTEGER },
	presence_penalty: { type: 'number', min: 0, max: 1 },
	frequency_penalty: { type: 'number', min: 0, max: 1 },
	seed: { type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER },
	mode: { type: 'string' },
	// Special case handled (split string on `;`)
	stop_words: { type: 'string' },
	concat_prompt: { type: 'boolean' },
	skill: { type: 'string' },
};
const isUserAllowedParameterKey = (
	key: string
): key is keyof UserAllowedParameters =>
	typeof USER_ALLOWED_PARAMETERS[key as keyof UserAllowedParameters] !==
	'undefined';

function checkUserAllowedParameters(
	key: keyof UserAllowedParameters,
	value: unknown
): string | null {
	const validation = USER_ALLOWED_PARAMETERS[key];

	if (typeof value !== validation.type) {
		return `Invalid parameter type: ${key} must be of type "${
			USER_ALLOWED_PARAMETERS[key]
		}" and is type "${typeof value}"`;
	}

	// If the mode parameter is not a valid model, return false
	if (key === 'mode' && !Object.values(ApiMode).includes(value as ApiMode)) {
		return `Invalid parameter type: ${key} must be one of "${Object.values(
			ApiMode
		).join('" / "')}"`;
	} else if (
		validation.type === 'number' &&
		typeof value === 'number' &&
		(validation.min > value || value > validation.max)
	) {
		return `Invalid parameter type: ${key} must be between ${validation.min} and ${validation.max}`;
	}

	return null;
}

export function completeCells() {
	const begin = new Date();

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

	if (!range) {
		return spreadsheet.toast('You did not select a range.', 'Error!');
	}

	if (!(range.getNumColumns() >= 2 && range.getNumRows() >= 2)) {
		return spreadsheet.toast(
			'You need to select a range with at least two columns and two rows.',
			'Error!'
		);
	}

	const batchRequest: ApiBatchRequestOptions<Endpoint.Create> = [];

	const [firstRow, ...rows] = range.getValues();

	const { error: rowValidationError, params } = _validateFirstRow(firstRow);

	if (rowValidationError) {
		return spreadsheet.toast(rowValidationError, 'Error!');
	}
	if (!params) throw new Error('Unreachable');

	for (const row of rows) {
		const [prompt, ...values] = row.slice(0, -1);

		const { error, options } = _createRequestOptions(
			prompt,
			params,
			values
		);

		if (error) return spreadsheet.toast(error, 'Error!');
		if (!options) throw new Error('Unreachable');

		batchRequest.push(options);
	}

	const { error, response } = new MuseRequest(apiKey).query(
		userProperties.getProperty(API_MODEL_PROP) as ApiModel,
		Endpoint.Create,
		batchRequest
	);

	if (error) throw error;
	if (!response) throw new Error('Unreachable');

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
	params?: (keyof UserAllowedParameters)[];
	error?: string;
} {
	// Omit the first and last columns (prompt and completion)
	const parameters = row.slice(1, -1);

	for (const param of parameters) {
		// Verify that the parameter is a valid string
		if (typeof param !== 'string') {
			return { error: `Invalid parameter type: ${param}` };
		}

		// Validate the parameter name
		if (!isUserAllowedParameterKey(param)) {
			return {
				error: `Parameter does not exist: ${param || '<empty>'}`,
			};
		}
	}

	return { params: parameters };
}

function _createRequestOptions(
	text: string,
	parameters: (keyof UserAllowedParameters)[],
	values: any[]
): {
	options?: ApiCreateOptions;
	error?: string;
} {
	if (parameters.length !== values.length) {
		throw new Error('Parameters and values do not match.');
	}

	const params: ApiCreateParams = {};

	for (const param of parameters) {
		let value = values.shift();

		// Skip empty parameters
		if (value === '') continue;

		// Check for invalid parameter types
		const error = checkUserAllowedParameters(param, value);

		if (error) return { error };

		// Special case for `stop_words`
		if (param === 'stop_words') {
			value = value.split(';');
		}

		// Add the parameter to the request
		params[param] = value;
	}

	return { options: { text, params } };
}
