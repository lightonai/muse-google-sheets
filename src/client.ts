import {
	type ApiBatchRequestOptions,
	type ApiModel,
	type ApiRequestOptions,
	type ApiResponse,
	Endpoint,
	MUSE_API_BASE_URL,
	MuseResponse,
	isApiResponseBadRequest,
	isApiResponseError,
} from 'lighton-muse';
import { USER_PROP_USE_STAGING_URL } from './index.js';

const jsonParseOrNull = (json: string): unknown | null => {
	try {
		return JSON.parse(json);
	} catch (error) {
		return null;
	}
};

export class MuseApiError extends Error {
	constructor(message: string, public requestId?: string) {
		super(message);

		this.name = 'MuseApiError';
	}

	toString() {
		if (this.requestId) {
			return `MuseApiError: ${this.message} (requestId: ${this.requestId})`;
		}

		return `MuseApiError: ${this.message}`;
	}
}

export class MuseRequest {
	constructor(private apiKey: string) {}

	public query<
		E extends Endpoint,
		O extends ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	>(model: ApiModel, endpoint: E, options: O): MuseResponse<E> {
		const response = this.raw(model, endpoint, options);
		const body = jsonParseOrNull(response.getContentText('utf-8'));

		if (
			response.getResponseCode() !== 200 &&
			isApiResponseBadRequest(body)
		) {
			return { error: new MuseApiError(body.detail), response: null };
		}

		if (isApiResponseError(body)) {
			return {
				error: new MuseApiError(body.error_msg, body.request_id),
				response: null,
			};
		}

		return {
			response: body as ApiResponse<E>,
			error: null,
		};
	}

	public raw<E extends Endpoint>(
		model: ApiModel,
		endpoint: E,
		options: ApiRequestOptions<E> | ApiBatchRequestOptions<E>
	): GoogleAppsScript.URL_Fetch.HTTPResponse {
		const userProperties = PropertiesService.getUserProperties();

		const base_url = userProperties.getProperty(USER_PROP_USE_STAGING_URL)
			? 'https://muse-staging-api.lighton.ai/muse/v1/'
			: MUSE_API_BASE_URL;

		const response = UrlFetchApp.fetch(`${base_url}${endpoint}`, {
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
