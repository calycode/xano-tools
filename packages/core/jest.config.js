import config from '../../jest.config.js';
export default {
   ...config,
   testPathIgnorePatterns: [
      ...(config.testPathIgnorePatterns ?? []),
      '/dist/',
   ],
};
