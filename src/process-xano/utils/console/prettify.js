import chalk from 'chalk';
const { blue, yellow, red, green } = chalk;

const logIcons = {
   info: 'ℹ️',
   warning: '⚠️',
   error: '❌',
   success: '✅'
};

const logColors = {
   info: blue,
   warning: yellow,
   error: red,
   success: green
};

function prettyLog(message, severity = 'info', ...args) {
   const icon = logIcons[severity] || logIcons.info;
   const color = logColors[severity] || blue;
   const paddedMessage = `   ${message}   `;
   console.log(color(`${icon} ${paddedMessage}`, args));
}

export { prettyLog };
