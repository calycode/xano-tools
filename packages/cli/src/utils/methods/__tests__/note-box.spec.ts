import { noteBox } from '../note-box';

const ANSI = /\x1b\[[0-9;]*m/g;
const visible = (s: string) => s.replace(ANSI, '');

describe('noteBox', () => {
   let writes: string[];
   let originalWrite: typeof process.stdout.write;
   let originalColumns: number | undefined;

   beforeAll(() => {
      originalWrite = process.stdout.write.bind(process.stdout);
      originalColumns = process.stdout.columns;
   });

   beforeEach(() => {
      writes = [];
      (process.stdout as any).write = (chunk: any) => {
         writes.push(String(chunk));
         return true;
      };
   });

   afterEach(() => {
      (process.stdout as any).write = originalWrite;
      Object.defineProperty(process.stdout, 'columns', {
         value: originalColumns,
         configurable: true,
         writable: true,
      });
   });

   const setColumns = (value: number) =>
      Object.defineProperty(process.stdout, 'columns', {
         value,
         configurable: true,
         writable: true,
      });

   it('caps the box width at 80 even when the terminal is very wide', () => {
      setColumns(300);
      noteBox('hello world', 'Title');

      const topBorder = visible(writes.join(''))
         .split('\n')
         .find((line) => line.includes('╭'));

      expect(topBorder?.length).toBe(80);
   });

   it('wraps long text so no line exceeds the capped width', () => {
      setColumns(300);
      noteBox('word '.repeat(60), 'Title');

      const lines = visible(writes.join(''))
         .split('\n')
         .filter(Boolean);

      for (const line of lines) {
         expect(line.length).toBeLessThanOrEqual(80);
      }
   });

   it('shrinks to a narrow terminal width', () => {
      setColumns(50);
      noteBox('hello world', 'Title');

      const topBorder = visible(writes.join(''))
         .split('\n')
         .find((line) => line.includes('╭'));

      expect(topBorder?.length).toBe(50);
   });
});
