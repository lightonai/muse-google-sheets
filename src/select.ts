import { ApiModel, Endpoint } from 'lighton-muse';
import { MuseRequest } from './client';
import { USER_PROP_API_KEY } from './index';
import { _getModel } from './completeCells';

// eslint-disable-next-line multiline-comment-style, spaced-comment
/*!
 * Perform a call to the select endpoint.
 *
 * @param reference {string}
 * @param candidates {Array<string>}
 * @return {string}
 *
 * @customfunction
 */
export function SELECT(reference: string, candidates: string[]): string {
	const userProperties = PropertiesService.getUserProperties();
	const apiKey = userProperties.getProperty(USER_PROP_API_KEY);
	const sheet = SpreadsheetApp.getActiveSheet();

	if (!apiKey) {
		throw new Error('You must first set your API key in the menu.');
	}

	if (reference === '') {
		throw new Error('You must provide a non-empty reference');
	}

	if (candidates.length < 2) {
		throw new Error('You must provide at least two candidates');
	}

	const model = _getModel(sheet) as ApiModel;
	const { error, response } = new MuseRequest(apiKey).query(
		model,
		Endpoint.Select,
		{
			reference,
			candidates,
		}
	);

	if (error && !response) throw error;

	return response.outputs[0][0].best;
}
