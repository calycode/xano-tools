import { encodeNativeMessage, isNativeHostDebugEnabled } from '../protocol';

describe('encodeNativeMessage', () => {
   it('prefixes the payload with a 4-byte little-endian length', () => {
      const framed = encodeNativeMessage({ a: 1 });

      // {"a":1} is 7 bytes; framing adds a 4-byte header.
      expect(framed.length).toBe(4 + 7);
      expect(framed.readUInt32LE(0)).toBe(7);
      expect([...framed.subarray(0, 4)]).toEqual([7, 0, 0, 0]);
      expect(framed.subarray(4).toString('utf8')).toBe('{"a":1}');
   });

   it('frames an empty object as a zero-length payload header', () => {
      const framed = encodeNativeMessage({});

      expect(framed.length).toBe(6);
      expect(framed.readUInt32LE(0)).toBe(2);
      expect(framed.subarray(4).toString('utf8')).toBe('{}');
   });
});

describe('isNativeHostDebugEnabled', () => {
   const sourceEntry = 'C:/repo/packages/cli/dist/index.cjs';
   const npmEntry =
      'C:/Users/me/AppData/Roaming/npm/node_modules/@calycode/cli/dist/index.cjs';

   it('always enables explicit CALY_OC_NATIVE_HOST_DEBUG=1', () => {
      expect(isNativeHostDebugEnabled('1', 'C:\\bin\\caly.exe', npmEntry)).toBe(true);
   });

   it('always disables explicit CALY_OC_NATIVE_HOST_DEBUG=0', () => {
      expect(isNativeHostDebugEnabled('0', 'C:\\nvm4w\\nodejs\\node.exe', sourceEntry)).toBe(
         false,
      );
   });

   it('defaults on for source-checkout runs', () => {
      expect(
         isNativeHostDebugEnabled(undefined, 'C:\\nvm4w\\nodejs\\node.exe', sourceEntry),
      ).toBe(true);
   });

   it('defaults off for npm-installed CLI runs', () => {
      expect(
         isNativeHostDebugEnabled(undefined, 'C:\\nvm4w\\nodejs\\node.exe', npmEntry),
      ).toBe(false);
   });

   it('defaults off for packaged caly binaries', () => {
      expect(isNativeHostDebugEnabled(undefined, '/usr/local/bin/caly', sourceEntry)).toBe(false);
      expect(isNativeHostDebugEnabled(undefined, 'C:\\bin\\caly.exe', sourceEntry)).toBe(false);
   });
});
