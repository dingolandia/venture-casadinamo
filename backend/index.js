const fs = require('fs');
const path = require('path');

const debugLogFile = path.join(__dirname, '../tmp/passenger-backend-debug.log');
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
    appendDebug('[backend uncaughtException]', err);
    console.error('[backend uncaughtException]', err);
});

process.on('unhandledRejection', err => {
    appendDebug('[backend unhandledRejection]', err);
    console.error('[backend unhandledRejection]', err);
});

appendDebug('[backend entry] loading dist/src/index');
console.log('[backend entry] loading dist/src/index');
require('./src/index');
