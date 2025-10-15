import { isEmptySchema, isNotEmpty } from '../src';

describe('isEmptySchema', () => {
   it('returns true for null or undefined', () => {
      expect(isEmptySchema(null)).toBe(true);
      expect(isEmptySchema(undefined)).toBe(true);
   });

   it('returns true for empty array', () => {
      expect(isEmptySchema([])).toBe(true);
   });

   it('returns false for non-empty array', () => {
      expect(isEmptySchema([1])).toBe(false);
   });

   it('returns true for empty object {}', () => {
      expect(isEmptySchema({})).toBe(true);
   });

   it('returns false for object with type and properties', () => {
      expect(isEmptySchema({ type: 'object', properties: { foo: { type: 'string' } } })).toBe(
         false
      );
   });

   it('returns true for object with type:object and empty properties', () => {
      expect(isEmptySchema({ type: 'object', properties: {} })).toBe(true);
   });

   it('returns true for object with only description', () => {
      expect(isEmptySchema({ description: 'foo' })).toBe(true);
   });

   it('returns true for object with only ignored keys', () => {
      expect(isEmptySchema({ type: undefined, description: undefined })).toBe(true);
   });

   it('returns false for object with extra meaningful keys', () => {
      expect(isEmptySchema({ type: 'string', format: 'email' })).toBe(false);
   });
});

describe('isNotEmpty', () => {
   it('returns false for null, undefined, or empty string', () => {
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
      expect(isNotEmpty('')).toBe(false);
   });

   it('returns true for non-empty string', () => {
      expect(isNotEmpty('abc')).toBe(true);
   });

   it('returns true for number 0', () => {
      expect(isNotEmpty(0)).toBe(true);
   });

   it('returns true for false boolean', () => {
      expect(isNotEmpty(false)).toBe(true);
   });

   it('returns true for objects and arrays', () => {
      expect(isNotEmpty([])).toBe(true);
      expect(isNotEmpty({})).toBe(true);
   });
});
