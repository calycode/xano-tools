import { replacePlaceholders } from '../src';

describe('replacePlaceholders', () => {
   it('replaces placeholders in a simple string', () => {
      const result = replacePlaceholders('Hello {name}, welcome to {app}!', {
         name: 'John',
         app: 'Caly',
      });
      expect(result).toBe('Hello John, welcome to Caly!');
   });

   it('returns original string if no placeholders', () => {
      expect(replacePlaceholders('No placeholders here.', { foo: 'bar' })).toBe(
         'No placeholders here.'
      );
   });

   it('replaces multiple occurrences of the same placeholder', () => {
      const result = replacePlaceholders('{word} {word} {word}', { word: 'repeat' });
      expect(result).toBe('repeat repeat repeat');
   });

   it('is case-insensitive for keys', () => {
      const result = replacePlaceholders('User: {NaMe}, App: {APP}', {
         NAME: 'Alice',
         app: 'TestApp',
      });
      expect(result).toBe('User: Alice, App: TestApp');
   });

   it('replaces placeholders in objects recursively', () => {
      const input = {
         url: 'https://{instance}.xano.io/api/{version}',
         headers: { 'X-Branch': '{branch}' },
      };
      const output = replacePlaceholders(input, {
         instance: 'x123',
         version: 'v1',
         branch: 'main',
      });
      expect(output).toEqual({
         url: 'https://x123.xano.io/api/v1',
         headers: { 'X-Branch': 'main' },
      });
   });

   it('replaces placeholders in arrays recursively', () => {
      const input = ['https://{host}/api/{version}', '{greeting} {name}'];
      const output = replacePlaceholders(input, {
         host: 'api.example.com',
         version: 'v2',
         greeting: 'Hi',
         name: 'Bob',
      });
      expect(output).toEqual(['https://api.example.com/api/v2', 'Hi Bob']);
   });

   it('handles nested arrays and objects', () => {
      const input = {
         messages: ['Hello {name}', { text: '{greeting}, {name}!', meta: ['{id}', '{unknown}'] }],
      };
      const output = replacePlaceholders(input, {
         name: 'Sam',
         greeting: 'Welcome',
         id: 42,
      });
      expect(output).toEqual({
         messages: ['Hello Sam', { text: 'Welcome, Sam!', meta: ['42', ''] }],
      });
   });

   it('returns empty string for missing replacements', () => {
      const str = 'Hello {missing}!';
      expect(replacePlaceholders(str, {})).toBe('Hello !');
   });

   it('works with number replacements', () => {
      const result = replacePlaceholders('ID: {id}, Count: {COUNT}', { id: 123, count: 45 });
      expect(result).toBe('ID: 123, Count: 45');
   });

   it('returns non-object, non-string, non-array values as-is', () => {
      expect(replacePlaceholders(42, { foo: 'bar' })).toBe(42);
      expect(replacePlaceholders(true, { foo: 'bar' })).toBe(true);
      expect(replacePlaceholders(null, { foo: 'bar' })).toBe(null);
      expect(replacePlaceholders(undefined, { foo: 'bar' })).toBe(undefined);
   });
});
