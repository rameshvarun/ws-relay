module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  "transformIgnorePatterns": [
      "<rootDir>/node_modules/(?!(ws-relay-client)/)"
    ]
};
