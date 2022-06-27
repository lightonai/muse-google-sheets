import { build } from 'tsup';
import { readFile, writeFile } from 'fs/promises';
import prettier from 'prettier';

// First build the files
await build({
	entry: ['src/index.ts'],

	format: 'iife',
	target: 'es2019',

	outExtension() {
		return {
			js: '.js',
		};
	},
});

// Retrieve the prettier config
const prettierConfig = await prettier.resolveConfig('.prettierrc.json');
if (!prettierConfig) {
	throw new Error('No prettier config found');
}

// Get the generated JS bundle
let content = await readFile('./dist/index.js', 'utf8');

// Extract the banner ('use strict';) and the IIFE (Immediately Invoked Function Expression) body
let result = content.match(
	/(?<banner>.*)\n\(\(\) => \{\n(?<body>(.*?\n)*)\}\)\(\);/muy
);
if (!result) {
	throw new Error('Could not find code to transform');
}

let output = `\
/* Code generated with \`tsup\` and a custom tool from LightOn */

${result.groups?.banner}

${result.groups?.body.replace(/\n {4}/g, '\n')}
`;

// Format the output using prettier
const formattedFile = prettier.format(output, {
	parser: 'babel',
	...prettierConfig,
});

// Writes the output for Clasp in index.gs
try {
	await writeFile('./index.gs', formattedFile);
} catch (err) {
	console.error(err);
}
