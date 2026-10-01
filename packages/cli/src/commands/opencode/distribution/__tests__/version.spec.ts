import {
   resolveOcVersion,
   parseOcVersionFromArgv,
   normalizeOcVersion,
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

   it('defaults to the latest channel', () => {
      expect(resolveOcVersion()).toBe(DEFAULT_OPENCODE_VERSION);
      expect(DEFAULT_OPENCODE_VERSION).toBe('latest');
   });

   it('returns an explicit pinned semantic version', () => {
      expect(resolveOcVersion('1.14.41')).toBe('1.14.41');
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
