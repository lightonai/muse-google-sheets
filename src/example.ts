import { ApiModel } from 'lighton-muse';
import { SHEET_META_API_MODEL } from './index.js';

const exampleSheet = [
	[
		'Prompt',
		'n_tokens',
		'p',
		'temperature',
		'presence_penalty',
		'Completion',
	],
	[
		'Eve is a helpful chatbot knowledgeable about Python.\n\nYou: How do I sort an array?\nEve: You can use the sort() method.\nYou: How do I remove the last element of an array?\nEve:\n',
		8,
		0.9,
		0.9,
		null,
		'You can use the pop() method.',
	],
	[
		"This is a review sentiment classifier.\n\nReview: 'The new Dune movie is great!'\nSentiment: Positive.\n***\nReview: 'Suicide Squad was an awful movie, that's 2 hours of my life I won't get back...'\nSentiment: Negative.\n***\nReview: 'Wooh, just came out of Interstellar and it was amazing.'\nSentiment: Positive.\n***\nReview: 'TBH Squid Game wasn't worth my time.'\nSentiment:",
		2,
		null,
		0.1,
		null,
		'Negative.',
	],
	[
		'The following is a list of companies and the categories they fall into\n\nMeta: Social media, Virtual Reality\nLinkedIn: Social media, Careers\nDeliveroo: Logistics, Food, Marketplace\nUber: Transportation, Marketplace\nUnilever: Conglomerate, Consumer Goods\nMcDonalds: Fast Food, Restaurants\nGoogle:',
		15,
		null,
		0.3,
		null,
		'Search, Internet',
	],
	[
		'Correct sentences into proper English.\n\nIncorrect: Can we use there house?\nCorrect:',
		8,
		null,
		0.2,
		null,
		'Can we use their house?',
	],
	[
		"Text: Double Asteroid Redirection Test (DART) is a NASA space mission aimed at testing a method of planetary defense against near-Earth objects (NEO). It will deliberately crash a space probe into the double asteroid Didymos' moon, Dimorphos, to test whether the kinetic energy of a spacecraft impact could successfully deflect an asteroid on a collision course with Earth. DART is a joint project between NASA and the Johns Hopkins Applied Physics Laboratory (APL), administered by NASA's Planetary Defense Coordination Office, with several NASA laboratories and offices providing technical support. International partners, such as the space agencies of Europe, Italy, and Japan, are contributing to related or subsequent projects. In August 2018, NASA approved the project to start the final design and assembly phase. DART was launched on 24 November 2021, at 06:21:02 UTC, with collision slated for 26 September 2022.\n\nKeywords:",
		15,
		null,
		0.7,
		1.0,
		'DART, Planetary Defense, Asteroid, Didymos, Moon',
	],
];

export function loadExampleSheet() {
	const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

	const newSheet = spreadsheet.insertSheet('Example');

	newSheet.addDeveloperMetadata(
		SHEET_META_API_MODEL,
		ApiModel.LyraEn,
		SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT
	);

	// Cells coordinates are 1-indexed
	newSheet
		.getRange(1, 1, exampleSheet[0].length, exampleSheet.length)
		.setValues(exampleSheet);
}
