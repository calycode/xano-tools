import config from '../../jest.config.js';

export default {
    ...config,
    setupFiles: ['<rootDir>/jest.setup.ts'],
};