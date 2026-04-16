process.on('uncaughtException', err => {
    console.error('[backend uncaughtException]', err);
});

process.on('unhandledRejection', err => {
    console.error('[backend unhandledRejection]', err);
});

console.log('[backend entry] loading dist/src/index');
require('./src/index');
