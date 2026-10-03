import { parseBooleanEnv } from '../parse-boolean';

describe('parseBooleanEnv', () => {
   it('parses truthy values case-insensitively', () => {
      for (const value of ['1', 'true', 'TRUE', ' yes ', 'on']) {
         expect(parseBooleanEnv(value, false)).toBe(true);
      }
   });

   it('parses falsy values case-insensitively', () => {
      for (const value of ['0', 'false', 'no', 'OFF']) {
         expect(parseBooleanEnv(value, true)).toBe(false);
      }
   });

   it('falls back for unset or unrecognized values', () => {
      expect(parseBooleanEnv(undefined, true)).toBe(true);
      expect(parseBooleanEnv('', true)).toBe(true);
      expect(parseBooleanEnv('maybe', false)).toBe(false);
   });
});
