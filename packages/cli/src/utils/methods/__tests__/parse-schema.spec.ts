import { parseSchemaContents } from '../parse-schema';

describe('parseSchemaContents', () => {
   it('parses JSON by .json extension', () => {
      expect(parseSchemaContents('{"a":1}', 'schema.json')).toEqual({ a: 1 });
   });

   it('parses YAML by .yaml/.yml extension', () => {
      expect(parseSchemaContents('a: 1\nb: two\n', 'schema.yaml')).toEqual({ a: 1, b: 'two' });
      expect(parseSchemaContents('a: 1', 'schema.yml')).toEqual({ a: 1 });
   });

   it('falls back to JSON then YAML for unknown extensions', () => {
      expect(parseSchemaContents('{"a":1}', 'schema')).toEqual({ a: 1 });
      expect(parseSchemaContents('a: 1', 'schema')).toEqual({ a: 1 });
   });

   it('throws a consistent error on invalid input', () => {
      expect(() => parseSchemaContents('{not json', 'schema.json')).toThrow(
         /Failed to parse schema file/,
      );
   });
});
