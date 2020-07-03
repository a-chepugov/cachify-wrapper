const packageJson = require('./package');

module.exports = {
	name: packageJson.name,
	includeVersion: true,
	toc: true,
	categorizeByGroup: true,
	readme: "none",
	theme: "minimal",
	hideGenerator: true,

	mode: "file",
	inputFiles: ['source/index.ts"'],
	out: './docs',

	excludePrivate: true,
	excludeProtected: true,
	excludeNotExported: true,
	exclude: ['**/*test.ts'],
	stripInternal: true,

	listInvalidSymbolLinks: true,
};
