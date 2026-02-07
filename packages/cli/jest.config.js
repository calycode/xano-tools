import config from '../../jest.config.js';
export default {
    ...config,
    testPathIgnorePatterns: ['src/commands/test/implementation/'],
};
