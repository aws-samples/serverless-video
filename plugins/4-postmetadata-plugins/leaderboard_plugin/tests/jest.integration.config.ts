module.exports = {
    displayName: "integration",
    testMatch: ['**/tests/integration/*.spec.ts'],
    transform: {
        '^.+\\.ts?$': 'esbuild-jest',
    },
};
