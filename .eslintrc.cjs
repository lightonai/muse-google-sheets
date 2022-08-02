/* eslint-disable */
const withTantalumConfig = require('@tantalum-config/eslint-config');

module.exports = withTantalumConfig('nextJs')({
	rules: {
		'import/extensions': 'off',
		'no-unused-expressions': 'off',
		camelcase: 'off',
		'no-underscore-dangle': 'off',
	},
});
