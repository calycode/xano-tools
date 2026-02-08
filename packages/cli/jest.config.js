import config from '../../jest.config.js';
export default {
    ...config,
    testPathIgnorePatterns: [
        ...(config.testPathIgnorePatterns ?? []),
        'src/commands/test/implementation/',
    ],
};
