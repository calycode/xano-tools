import config from '../../jest.config.js';
export default {
    ...config,
    setupFiles: [...(config.setupFiles ?? []), '<rootDir>/jest.setup.ts'],
    testPathIgnorePatterns: [
        ...(config.testPathIgnorePatterns ?? []),
        'src/commands/test/implementation/',
    ],
};
