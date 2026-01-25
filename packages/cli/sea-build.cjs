const { release } = require('sea-builder');

const config = require('./sea.config.cjs').cli;

async function buildCli() {
    config.entry = 'dist/cli.cjs/index.cjs';

    const results = await release(config);
    console.log('Built:', results.map(r => r.path));
}

buildCli();
