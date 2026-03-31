module.exports = {
  testEnvironment: "node",
  verbose: true,
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/loadTestEnv.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.js"],
  clearMocks: true,
  bail: false,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.js"],
  testTimeout: 30000,
};
