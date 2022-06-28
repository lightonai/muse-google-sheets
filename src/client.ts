import type {
	ApiRequestOptions,
	ApiModels,
	ApiBatchRequestOptions,
	ApiResponse,
} from 'lighton-muse';
import {
	MUSE_API_BASE_URL,
	isApiResponseError,
	MuseResponse,
	isApiResponseBadRequest,
	Endpoints,
} from 'lighton-muse';

export class MuseRequest {
	constructor(private apiKey: string) {}

	public query<
		E extends Endpoints,
		O extends ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	>(model: ApiModels, endpoint: E, options: O): MuseResponse<E> {
		const response = this.raw(model, endpoint, options);
		const body = jsonParseOrNull(response.getContentText('utf-8'));

		if (response.getResponseCode() !== 200 && isApiResponseBadRequest(body))
			return { error: new Error(body.detail), response: null };

		if (isApiResponseError(body)) {
			return {
				error: new Error(`${body.request_id} - ${body.error_msg}`),
				response: null,
			};
		}

		return {
			response: body as ApiResponse<E>,
			error: null,
		};
	}

	public raw<E extends Endpoints>(
		model: ApiModels,
		endpoint: E,
		options: ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	): GoogleAppsScript.URL_Fetch.HTTPResponse {
		// TODO: use prod api endpoint
		// const url = `${MUSE_API_BASE_URL}${endpoint}`;

		const url = `https://muse-staging-api.lighton.ai/muse/v1/${endpoint}`;

		const response = UrlFetchApp.fetch(url, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'X-Api-Key': this.apiKey,
				'X-Model': model,
			},
			payload: JSON.stringify(options),
			muteHttpExceptions: true,
		});

		return response;
	}
}

const jsonParseOrNull = (json: string): unknown | null => {
	try {
		return JSON.parse(json);
	} catch (error) {
		return null;
	}
};
