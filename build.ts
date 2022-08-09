import { readFile, writeFile } from 'fs/promises';
import { build } from 'tsup';
import prettier from 'prettier';

const LIGHTON_MUSE_FILE = './node_modules/lighton-muse/dist/index.js';
const LEGAL_COMMENT_REGEX = /\/\*!([\s\S]*?)\*\//gu;

const warnings = ['\nWarnings:'];

try {
	let content = await readFile(LIGHTON_MUSE_FILE, 'utf-8');

	// Patch `lighton-muse` dependency to avoid bundling `node-fetch`.
	content = content.replace(/import .* from "node-fetch";\n/gu, '');

	await writeFile(LIGHTON_MUSE_FILE, content);

	warnings.push('⚠️ Patched lighton-muse to avoid bundling node-fetch.');
	warnings.push('⚠️ You cannot use the exported `MuseRequest` class.');
} catch (error) {
	console.error('An error happened during `lighton-muse` patch.');
	console.error(error);

	process.exit(1);
}

// Bundle the files
await build({
	entry: ['src/index.ts'],

	format: 'iife',
	target: 'es2019',

	esbuildOptions: (options) => {
		options.legalComments = 'inline';
	},

	outExtension() {
		return {
			js: '.js',
		};
	},
});

// Get the generated JS bundle
const bundleContent = await readFile('./dist/index.js', 'utf8');

// Processes the content and format the bundle for Apps Script readability
const processedContent = await formatFile(processFile(bundleContent));

// Writes the output for Clasp in index.gs
await writeFile('./index.gs', processedContent);

// Print the warnings
warnings.forEach((warn) => console.log(warn));

function processFile(content: string): string {
	// Extract the banner ('use strict';) and the IIFE (Immediately Invoked Function Expression) body
	const result = content.match(
		/(?<banner>.*)\n\(\(\) => \{\n(?<body>(.*?\n)*)\}\)\(\);/muy
	);

	if (!result) {
		throw new Error('Could not find code to transform');
	}

	let output = `\
/* Code generated with \`tsup\` and a custom tool from LightOn */

${result.groups?.banner}

${result.groups?.body.replace(/\n {4}/gu, '\n')}
`;

	/*
	 * Change legal comments to bypass ESBuild drop of all JS Doc Comments
	 * Permits autocompletion for custom Google Sheets function
	 */
	output = output.replace(LEGAL_COMMENT_REGEX, '/**$1*/');

	return output;
}

async function formatFile(content: string): Promise<string> {
	// Retrieve the prettier config
	const prettierConfig = await prettier.resolveConfig('.prettierrc.json');

	if (!prettierConfig) {
		throw new Error('No prettier config found');
	}

	// Format the output using prettier
	const formattedContent = prettier.format(content, {
		parser: 'babel',
		...prettierConfig,
	});

	return formattedContent;
}
