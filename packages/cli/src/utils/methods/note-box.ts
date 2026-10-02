import { font } from './font';

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const MIN_WIDTH = 40;
const MAX_WIDTH = 80;
const INDENT = '  ';

function visibleLength(value: string): number {
   return value.replace(ANSI_PATTERN, '').length;
}

function padRight(value: string, width: number): string {
   return value + ' '.repeat(Math.max(0, width - visibleLength(value)));
}

/** Wrap text to `width`, hard-splitting words that are longer than the width. */
function wrap(text: string, width: number): string[] {
   const lines: string[] = [];
   let current = '';
   const flush = () => {
      if (current) {
         lines.push(current);
         current = '';
      }
   };

   for (const word of text.split(/\s+/).filter(Boolean)) {
      if (word.length > width) {
         flush();
         for (let i = 0; i < word.length; i += width) {
            lines.push(word.slice(i, i + width));
         }
         continue;
      }
      if (!current) {
         current = word;
      } else if (current.length + 1 + word.length <= width) {
         current += ' ' + word;
      } else {
         flush();
         current = word;
      }
   }
   flush();
   return lines.length ? lines : [''];
}

/**
 * Render a framed note box with a capped width, so it stays neat regardless of
 * the (sometimes huge) terminal width reported on Windows.
 */
export function noteBox(message: string, title?: string): void {
   const columns = process.stdout.columns || MAX_WIDTH;
   const width = Math.max(MIN_WIDTH, Math.min(columns, MAX_WIDTH));
   const textWidth = width - INDENT.length - 4;

   const border = font.color.gray;
   const top = title
      ? `${border('╭─ ')}${font.combo.boldCyan(title)} ${border(
           '─'.repeat(Math.max(0, width - visibleLength(title) - 5)) + '╮',
        )}`
      : border(`╭${'─'.repeat(width - 2)}╮`);

   const bodyLine = (text: string) =>
      `${border('│')} ${padRight(INDENT + text, textWidth + INDENT.length)} ${border('│')}`;

   const body: string[] = [];
   for (const raw of message.split('\n')) {
      if (raw.trim() === '') {
         body.push(bodyLine(''));
         continue;
      }
      for (const line of wrap(raw.trim(), textWidth)) {
         body.push(bodyLine(line));
      }
   }

   const bottom = border(`╰${'─'.repeat(width - 2)}╯`);
   const box = [top, bodyLine(''), ...body, bodyLine(''), bottom].join('\n');
   process.stdout.write('\n' + box + '\n');
}
