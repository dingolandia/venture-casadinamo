const fs = require('fs');
const path = require('path');

const debugLogFile = path.join(__dirname, '../logs/passenger-frontend-bootstrap.log');

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
    appendDebug('[frontend uncaughtException]', err);
    console.error('[frontend uncaughtException]', err);
});

process.on('unhandledRejection', err => {
    appendDebug('[frontend unhandledRejection]', err);
    console.error('[frontend unhandledRejection]', err);
});

appendDebug('[frontend entry] loading dist/server/main.js');

const serverModule = require('./dist/server/main.js');

if (typeof serverModule.app !== 'function') {
    throw new Error('SSR bundle did not export app() from dist/server/main.js');
}

const port = process.env.PORT || 4000;
const host = process.env.HOST || '0.0.0.0';
const server = serverModule.app();

server.listen(port, host, () => {
    const listenAddress = `http://${host}:${port}`;
    appendDebug('[frontend entry] listening on', listenAddress);
    console.log(`[frontend entry] listening on ${listenAddress}`);
});
