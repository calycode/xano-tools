import { isValidCorsOrigin, filterAndValidateOrigins, MAX_CORS_ORIGINS } from '../origins';

const KNOWN_EXTENSION_ID = 'hadkkdmpcmllbkfopioopcmeapjchpbm';
const UNKNOWN_EXTENSION_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('isValidCorsOrigin', () => {
   it('accepts an https origin', () => {
      expect(isValidCorsOrigin('https://app.xano.com', [KNOWN_EXTENSION_ID])).toBe(true);
   });

   it('accepts a known chrome extension origin', () => {
      expect(
         isValidCorsOrigin(`chrome-extension://${KNOWN_EXTENSION_ID}`, [KNOWN_EXTENSION_ID]),
      ).toBe(true);
   });

   it('rejects an unlisted chrome extension origin', () => {
      expect(
         isValidCorsOrigin(`chrome-extension://${UNKNOWN_EXTENSION_ID}`, [KNOWN_EXTENSION_ID]),
      ).toBe(false);
   });

   it('rejects a wildcard', () => {
      expect(isValidCorsOrigin('*', [KNOWN_EXTENSION_ID])).toBe(false);
   });

   it('rejects a non-https origin', () => {
      expect(isValidCorsOrigin('http://app.xano.com', [KNOWN_EXTENSION_ID])).toBe(false);
   });
});

describe('filterAndValidateOrigins', () => {
   it('keeps valid origins, drops invalid ones, and de-duplicates', () => {
      const result = filterAndValidateOrigins(
         [
            'https://app.xano.com',
            '*',
            'https://app.xano.com',
            'http://insecure.example.com',
            `chrome-extension://${KNOWN_EXTENSION_ID}`,
         ],
         [KNOWN_EXTENSION_ID],
      );

      expect(result).toEqual(['https://app.xano.com', `chrome-extension://${KNOWN_EXTENSION_ID}`]);
   });

   it('caps the result at the maximum number of origins', () => {
      const manyOrigins = Array.from({ length: MAX_CORS_ORIGINS + 5 }, (_, i) => `https://h${i}.com`);

      expect(filterAndValidateOrigins(manyOrigins, [])).toHaveLength(MAX_CORS_ORIGINS);
   });

   it('returns an empty list for a non-array input', () => {
      expect(filterAndValidateOrigins('not-an-array', [])).toEqual([]);
   });
});
