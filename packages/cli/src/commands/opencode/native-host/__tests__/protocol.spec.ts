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
   it('always enables explicit CALY_OC_NATIVE_HOST_DEBUG=1', () => {
      expect(isNativeHostDebugEnabled('1', 'C:\\bin\\caly.exe')).toBe(true);
   });

   it('always disables explicit CALY_OC_NATIVE_HOST_DEBUG=0', () => {
      expect(isNativeHostDebugEnabled('0', 'C:\\nvm4w\\nodejs\\node.exe')).toBe(false);
   });

   it('defaults on for source/node runs', () => {
      expect(isNativeHostDebugEnabled(undefined, 'C:\\nvm4w\\nodejs\\node.exe')).toBe(true);
   });

   it('defaults off for packaged caly binaries', () => {
      expect(isNativeHostDebugEnabled(undefined, '/usr/local/bin/caly')).toBe(false);
      expect(isNativeHostDebugEnabled(undefined, 'C:\\bin\\caly.exe')).toBe(false);
   });
});
