function wrap(open: number, close: number) {
   return (str: string) => `\x1b[${open}m${str}\x1b[${close}m`;
}

// Colors
const cyan = wrap(36, 39);
const yellowBright = wrap(93, 39);
const white = wrap(37, 39);
const gray = wrap(90, 39);
const green = wrap(32, 39);

// Weight
const bold = wrap(1, 22);

// Combined color + weight variants
const boldCyan = (str: string) => bold(cyan(str));
const boldGreen = (str: string) => bold(green(str));

const font = {
   color: {
      cyan,
      yellowBright,
      white,
      gray,
      green,
   },
   weight: {
      bold,
   },
   combo: {
      boldCyan,
      boldGreen,
   },
};

export { font };
