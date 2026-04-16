import fs from 'fs';
import path from 'path';

import { bootstrap, runMigrations } from '@vendure/core';

import { config } from './vendure-config';

const bootstrapLogPath = path.join(__dirname, '../../tmp/bootstrap-server.log');

function appendBootstrapLog(message: string, error?: unknown) {
    try {
        fs.mkdirSync(path.dirname(bootstrapLogPath), { recursive: true });
        const details =
            error instanceof Error
                ? error.stack || error.message
                : error
                  ? JSON.stringify(error)
                  : '';
        fs.appendFileSync(
            bootstrapLogPath,
            `[${new Date().toISOString()}] ${message}${details ? ` ${details}` : ''}\n`,
        );
    } catch {}
}

appendBootstrapLog('server bootstrap start');
appendBootstrapLog(
    'server config snapshot',
    {
        port: config.apiOptions.port,
        adminApiPath: config.apiOptions.adminApiPath,
        shopApiPath: config.apiOptions.shopApiPath,
        dbType: (config.dbConnectionOptions as { type?: string }).type,
    },
);

runMigrations(config)
    .then(() => {
        appendBootstrapLog('runMigrations success');
        return bootstrap(config);
    })
    .then(() => {
        appendBootstrapLog('bootstrap success');
    })
    .catch(err => {
        appendBootstrapLog('server bootstrap error', err);
        console.log(err);
    });
