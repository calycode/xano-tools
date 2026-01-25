module.exports = {
    cli: {
        entry: 'dist/cli.cjs/index.cjs',
        name: '@calycode-cli-installer',
        platforms: ['linux-x64', 'win-x64', 'darwin-x64', 'darwin-arm64'],
        outDir: './dist/exes',
        assets: {
            'licenses.txt': './LICENSE',
            'README.md': './README.md'
        },
        useCodeCache: true
    }
};
