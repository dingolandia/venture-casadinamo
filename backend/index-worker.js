process.on('uncaughtException', err => {
    console.error('[worker uncaughtException]', err);
});

process.on('unhandledRejection', err => {
    console.error('[worker unhandledRejection]', err);
});

console.log('[worker entry] loading dist/src/index-worker');
require('./src/index-worker');
