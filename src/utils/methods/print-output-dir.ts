// [ ] CLI

function printOutputDir(doLog: boolean = false, dir: string = ''): void {
   if (doLog) console.log(`OUTPUT_DIR=${dir}`);
}

export { printOutputDir };
