import fs from 'fs';
import path from 'path';

import { bootstrapWorker } from '@vendure/core';

import { config } from './vendure-config';

const bootstrapLogPath = path.join(__dirname, '../../tmp/bootstrap-worker.log');

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

appendBootstrapLog('worker bootstrap start');
appendBootstrapLog(
    'worker config snapshot',
    {
        dbType: (config.dbConnectionOptions as { type?: string }).type,
    },
);

bootstrapWorker(config)
    .then(worker => {
        appendBootstrapLog('bootstrapWorker success');
        return worker.startJobQueue();
    })
    .then(() => {
        appendBootstrapLog('worker job queue started');
    })
    .catch(err => {
        appendBootstrapLog('worker bootstrap error', err);
        console.log(err);
    });
