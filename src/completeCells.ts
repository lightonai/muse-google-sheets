import {
	ApiBatchRequestOptions,
	ApiCreateOptions,
	ApiCreateParams,
	ApiMode,
	ApiModel,
	Endpoint,
} from 'lighton-muse';
import { MuseRequest, jsonParseOrNull } from './client.js';
import { SHEET_META_API_MODEL, USER_PROP_API_KEY } from './index.js';

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
	// Special case handled (`".", ";", ","`)
	stop_words: { type: 'string' },
	concat_prompt: { type: 'boolean' },
	skill: { type: 'string' },
};
const isUserAllowedParameterKey = (
	key: string
): key is keyof UserAllowedParameters =>
	typeof USER_ALLOWED_PARAMETERS[key as keyof UserAllowedParameters] !==
	'undefined';

const _getModel = (sheet: GoogleAppsScript.Spreadsheet.Sheet) =>
	sheet
		.getDeveloperMetadata()
		.find((meta) => meta.getKey() === SHEET_META_API_MODEL)
		?.getValue() ?? ApiModel.OrionEn;

function _checkUserAllowedParameters(
	key: keyof UserAllowedParameters,
	value: unknown
): string | null {
	const validation = USER_ALLOWED_PARAMETERS[key];

	if (typeof value !== validation.type) {
		return `Invalid parameter type: ${key} must be of type "${
			USER_ALLOWED_PARAMETERS[key].type
		}" and is type "${typeof value}"`;
	}

	// If the mode parameter is not a valid model, return false
	if (key === 'mode' && !Object.values(ApiMode).includes(value as ApiMode)) {
		return `Invalid parameter type: ${key} must be one of "${Object.values(
			ApiMode
		).join('" / "')}"`;
	} else if (key === 'stop_words') {
		const json = jsonParseOrNull(`[${value}]`);

		if (!json || !Array.isArray(json)) {
			return `Invalid parameter type: ${key} is not a valid list`;
		}

		if (json.find((word) => typeof word !== 'string')) {
			return `Invalid parameter type: ${key} must be a list of strings`;
		}
	} else if (
		validation.type === 'number' &&
		typeof value === 'number' &&
		(validation.min > value || value > validation.max)
	) {
		return `Invalid parameter type: ${key} must be between ${validation.min} and ${validation.max}`;
	}

	return null;
}

function _validateFirstRow(row: any[]): {
	params?: (keyof UserAllowedParameters)[];
	error?: string;
} {
	// Omit last column (completion)
	const [prompt, ...parameters] = row.slice(0, -1);

	// Check that the upper-right cell is the text `prompt`
	if (!(typeof prompt === 'string' && prompt.toLowerCase() === 'prompt')) {
		return {
			error: 'The upper-right cell must contain the text `Prompt`.',
		};
	}

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
		const error = _checkUserAllowedParameters(param, value);

		if (error) return { error };

		// Special case for `stop_words`
		if (typeof value === 'string' && param === 'stop_words') {
			value = JSON.parse(`[${value}]`);
		}

		// Add the parameter to the request
		params[param] = value;
	}

	return { options: { text, params } };
}

export function completeCells() {
	const begin = new Date();

	const userProperties = PropertiesService.getUserProperties();
	const apiKey = userProperties.getProperty(USER_PROP_API_KEY);

	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = SpreadsheetApp.getActiveSheet();
	const range = sheet.getActiveRange();

	if (!apiKey) {
		return spreadsheet.toast(
			'You must set your API key in order to use Muse.',
			'Error!',
			0
		);
	}

	if (!range) {
		return spreadsheet.toast('You did not select a range.', 'Error!', 0);
	}

	if (!(range.getNumColumns() >= 2 && range.getNumRows() >= 2)) {
		return spreadsheet.toast(
			'You need to select a range with at least two columns and two rows.',
			'Error!',
			0
		);
	}

	const batchRequest: ApiBatchRequestOptions<Endpoint.Create> = [];

	const [firstRow, ...rows] = range.getValues();

	const { error: rowValidationError, params } = _validateFirstRow(firstRow);

	if (rowValidationError) {
		return spreadsheet.toast(rowValidationError, 'Error!', 0);
	}
	if (!params) throw new Error('Unreachable');

	// Validate each row
	for (const row of rows) {
		const [prompt, ...values] = row.slice(0, -1);

		const { error, options } = _createRequestOptions(
			prompt,
			params,
			values
		);

		if (error) return spreadsheet.toast(error, 'Error!', 0);
		if (!options) throw new Error('Unreachable');

		batchRequest.push(options);
	}

	// Make the request to the Api
	const model = _getModel(sheet) as ApiModel;
	const { error, response } = new MuseRequest(apiKey).query(
		model,
		Endpoint.Create,
		batchRequest
	);

	if (error) throw error;
	if (!response) throw new Error('Unreachable');

	for (let index = 0; index < response.outputs.length; index++) {
		const output = response.outputs[index][0].completions[0].output_text;

		// Cells coordinates are 1-indexed
		range
			.getCell(index + 1 + 1, range.getNumColumns())
			.setValue(output.trim());
	}

	spreadsheet.toast(
		`Done in ${
			(new Date().valueOf() - begin.valueOf()) / 1000
		} with ${model}`,
		'Done!'
	);
}
