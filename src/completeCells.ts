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

type UserAllowedParameters = Omit<
	Required<ApiCreateParams>,
	'n_completions' | 'return_logprobs'
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
		: T[P] extends Record<string, number>
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
	// Special case handled (`"another": 2.0, "word": 3.0`)
	biases: { type: 'string' },
	concat_prompt: { type: 'boolean' },
	skill: { type: 'string' },
};
const isUserAllowedParameterKey = (
	key: string
): key is keyof UserAllowedParameters =>
	typeof USER_ALLOWED_PARAMETERS[key as keyof UserAllowedParameters] !==
	'undefined';

export const _getModel = (sheet: GoogleAppsScript.Spreadsheet.Sheet) =>
	sheet
		.getDeveloperMetadata()
		.find((meta) => meta.getKey() === SHEET_META_API_MODEL)
		?.getValue() ?? ApiModel.OrionEn;

function checkUserAllowedParameters_(
	key: keyof UserAllowedParameters,
	value: unknown
): string | null {
	const validation = USER_ALLOWED_PARAMETERS[key];

	if (typeof value !== validation.type) {
		return `Invalid parameter type: ${key} must be of type "${
			USER_ALLOWED_PARAMETERS[key].type
		}" and is type "${typeof value}"`;
	}

	let json, last, modes;

	switch (key) {
		// Check if the `mode` parameter is not a valid model
		case 'mode':
			[last, ...modes] = Object.values(ApiMode);

			if (!Object.values(ApiMode).includes(value as ApiMode)) {
				return `Invalid parameter type: ${key} must be one of ${modes.join(
					', '
				)} or ${last}.`;
			}

			break;

		// Check if the `stop_words` parameter is not a valid array
		case 'stop_words':
			// Trim the last comma, if any
			value = `${value}`.replace(/,\s*$/u, '');

			json = jsonParseOrNull(`[${value}]`);

			if (!json || !Array.isArray(json)) {
				return `Invalid parameter type: ${key} is not a valid list`;
			}

			if (json.find((word) => typeof word !== 'string')) {
				return `Invalid parameter type: ${key} must be a list of strings`;
			}

			break;

		// Check if the `biases` parameter is not a valid Record<string, number>
		case 'biases':
			// Trim the last comma, if any
			value = `${value}`.replace(/,\s*$/u, '');

			json = jsonParseOrNull(`{${value}}`);

			if (!json || Array.isArray(json) || typeof json !== 'object') {
				return `Invalid parameter type: ${key} is not a valid object`;
			}

			if (
				Object.values(json).find((weight) => typeof weight !== 'number')
			) {
				return `Invalid parameter type: ${key} must be a record of numbers`;
			}

			break;

		// Check if the `number` parameters are in their valid range
		default:
			if (
				typeof value === 'number' &&
				validation.type === 'number' &&
				(validation.min > value || value > validation.max)
			) {
				return `Invalid parameter type: ${key} must be between ${validation.min} and ${validation.max}`;
			}
	}

	return null;
}

function validateFirstRow_(row: any[]): {
	params?: (keyof UserAllowedParameters)[];
	error?: string;
} {
	// Omit last column (completion)
	const [prompt, ...parameters] = row.slice(0, -1);

	// Check that the upper-right cell is the text `prompt`
	if (!(typeof prompt === 'string' && prompt.toLowerCase() === 'prompt')) {
		return {
			error: 'The upper-left cell must contain the text `Prompt`.',
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

function createRequestOptions_(
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
		const error = checkUserAllowedParameters_(param, value);

		if (error) return { error };

		// Special cases
		switch (param) {
			case 'stop_words':
				value = JSON.parse(`[${value}]`);
				break;

			case 'biases':
				value = JSON.parse(`{${value}}`);
				break;
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

	// Check if the minimum area is met
	if (!(range.getNumColumns() >= 2 && range.getNumRows() >= 2)) {
		return spreadsheet.toast(
			'You need to select a range with at least two columns and two rows.',
			'Error!',
			0
		);
	}

	// Api Batch Request limit is 128
	if (range.getNumRows() > 128 + 1) {
		return spreadsheet.toast(
			'You need to select a range with less than 129 rows.',
			'Error!',
			0
		);
	}

	const batchRequest: ApiBatchRequestOptions<Endpoint.Create> = [];

	const [firstRow, ...rows] = range.getValues();

	const { error: rowValidationError, params } = validateFirstRow_(firstRow);

	if (rowValidationError) {
		return spreadsheet.toast(rowValidationError, 'Error!', 0);
	}
	if (!params) throw new Error('Unreachable');

	// Validate each row
	for (const row of rows) {
		const [prompt, ...values] = row.slice(0, -1);

		const { error, options } = createRequestOptions_(
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
		}s with ${model}`,
		'Done!'
	);
}
