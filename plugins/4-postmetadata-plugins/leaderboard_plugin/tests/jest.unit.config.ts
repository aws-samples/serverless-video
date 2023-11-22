module.exports = {
    displayName: "unit",
    testMatch: ['**/tests/unit/*.spec.ts'],
    transform: {
        '^.+\\.ts?$': 'esbuild-jest',
    },
};
