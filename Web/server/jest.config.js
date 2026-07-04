module.exports = {
	testEnvironment: "node",
	coveragePathIgnorePatterns: ["/node_modules/"],
	testMatch: ["**/tests/**/*.test.js"],
	collectCoverageFrom: ["src/**/*.js", "!src/index.js"],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
	transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
};
