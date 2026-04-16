const fs = require('fs');
const path = require('path');

const debugLogFile = path.join(__dirname, '../tmp/passenger-worker-debug.log');
const appendDebug = (...parts) => {
    try {
        fs.mkdirSync(path.dirname(debugLogFile), { recursive: true });
        fs.appendFileSync(
            debugLogFile,
            `[${new Date().toISOString()}] ${parts
                .map(part => (part instanceof Error ? (part.stack || part.message) : String(part)))
                .join(' ')}\n`,
        );
    } catch {}
};

process.on('uncaughtException', err => {
    appendDebug('[worker uncaughtException]', err);
    console.error('[worker uncaughtException]', err);
});

process.on('unhandledRejection', err => {
    appendDebug('[worker unhandledRejection]', err);
    console.error('[worker unhandledRejection]', err);
});

appendDebug('[worker entry] loading dist/src/index-worker');
console.log('[worker entry] loading dist/src/index-worker');
require('./src/index-worker');
