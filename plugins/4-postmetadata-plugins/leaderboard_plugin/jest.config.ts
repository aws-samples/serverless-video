/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config:Config = {
    projects: ["<rootDir>/tests/jest.unit.config.ts","<rootDir>/tests/jest.integration.config.ts"],
    transform: {
        '^.+\\.ts?$': 'esbuild-jest',
    },
    preset: "ts-jest",
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    verbose: true,
    testMatch: ['**/tests/**/*.spec.ts']
};

process.env = Object.assign(process.env, {
    PLUGIN_NAME: 'postMetadata.leaderboardPlugin',
    LEADERBOARD_SERVICE_ENDPOINT: 'https://jsonplaceholder.typicode.com',
    AWS_REGION: 'us-west-2',     // must be set to region you have deployed plugin tester to
    STACK_NAME: 'sflix-plugin-tester'
});

export default config;
