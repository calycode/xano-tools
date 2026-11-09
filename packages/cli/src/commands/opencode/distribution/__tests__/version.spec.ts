import {
   resolveOcVersion,
   parseOcVersionFromArgv,
   normalizeOcVersion,
   getOpencodeMajorVersion,
   DEFAULT_OPENCODE_VERSION,
} from '../version';

describe('resolveOcVersion', () => {
   const originalEnv = process.env.CALY_OC_OPENCODE_VERSION;

   beforeEach(() => {
      delete process.env.CALY_OC_OPENCODE_VERSION;
   });

   afterAll(() => {
      if (originalEnv === undefined) {
         delete process.env.CALY_OC_OPENCODE_VERSION;
      } else {
         process.env.CALY_OC_OPENCODE_VERSION = originalEnv;
      }
   });

   it('defaults to the pinned OpenCode V2 runtime', () => {
      expect(resolveOcVersion()).toBe(DEFAULT_OPENCODE_VERSION);
      expect(DEFAULT_OPENCODE_VERSION).toBe('2.2.6');
   });

   it('returns an explicit pinned semantic version', () => {
      expect(resolveOcVersion('2.2.6')).toBe('2.2.6');
   });

   it('accepts the explicit "latest" value', () => {
      expect(resolveOcVersion('latest')).toBe('latest');
   });

   it('rejects a malformed explicit version', () => {
      expect(() => resolveOcVersion('1.2')).toThrow(/Invalid OpenCode version/);
   });

   it('reads the environment override when no explicit version is given', () => {
      process.env.CALY_OC_OPENCODE_VERSION = '2.0.0';
      expect(resolveOcVersion()).toBe('2.0.0');
   });

   it('prefers the explicit version over the environment override', () => {
      process.env.CALY_OC_OPENCODE_VERSION = '2.0.0';
      expect(resolveOcVersion('3.1.0')).toBe('3.1.0');
   });
});

describe('getOpencodeMajorVersion', () => {
   it('reads the major version from a pinned release', () => {
      expect(getOpencodeMajorVersion('2.2.6')).toBe(2);
      expect(getOpencodeMajorVersion('1.19.5')).toBe(1);
   });

   it('returns null for a floating channel or missing value', () => {
      expect(getOpencodeMajorVersion('latest')).toBeNull();
      expect(getOpencodeMajorVersion(undefined)).toBeNull();
   });
});

describe('normalizeOcVersion', () => {
   it('trims surrounding whitespace', () => {
      expect(normalizeOcVersion('  1.2.3  ')).toBe('1.2.3');
   });

   it('treats blank input as absent', () => {
      expect(normalizeOcVersion('   ')).toBeUndefined();
      expect(normalizeOcVersion(undefined)).toBeUndefined();
   });
});

describe('parseOcVersionFromArgv', () => {
   it('parses the separated form', () => {
      expect(parseOcVersionFromArgv(['run', '--oc-version', '1.2.3'])).toBe('1.2.3');
   });

   it('parses the inline form', () => {
      expect(parseOcVersionFromArgv(['--oc-version=1.2.3'])).toBe('1.2.3');
   });

   it('returns undefined when absent', () => {
      expect(parseOcVersionFromArgv(['run', '--help'])).toBeUndefined();
   });
});
