import type {
	ApiRequestOptions,
	ApiModels,
	ApiBatchRequestOptions,
	ApiBatchResponse,
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

	public async query<
		E extends Endpoints,
		O extends ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	>(model: ApiModels, endpoint: E, options: O): Promise<MuseResponse<E, O>> {
		const response = await this.raw(model, endpoint, options);
		const body = jsonParseOrNull(response.getContentText('utf-8'));

		Logger.log(body);

		if (response.getResponseCode() !== 200 && isApiResponseBadRequest(body))
			return { error: new Error(body.details), response: null };

		if (isApiResponseError(body)) {
			return {
				error: new Error(`${body.request_id} - ${body.error_msg}`),
				response: null,
			};
		}

		return {
			response: body as O extends ApiBatchRequestOptions<E>
				? ApiBatchResponse<E>
				: ApiResponse<E>,
			error: null,
		};
	}

	public async raw<E extends Endpoints>(
		model: ApiModels,
		endpoint: E,
		options: ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	): Promise<GoogleAppsScript.URL_Fetch.HTTPResponse> {
		const url = `${MUSE_API_BASE_URL}${endpoint}`;

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
