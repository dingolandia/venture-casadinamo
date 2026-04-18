import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import * as express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import 'zone.js/node';

import { AppServerModule } from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app() {
    const server = express();
    const commonEngine = new CommonEngine();

    const distFolder = join(process.cwd(), 'dist/browser');
    const indexHtml = existsSync(join(distFolder, 'index.original.html'))
        ? join(distFolder, 'index.original.html')
        : join(distFolder, 'index.html');

    server.set('view engine', 'html');
    server.set('views', distFolder);

    // Example Express Rest API endpoints
    // app.get('/api/**', (req, res) => { });
    // Serve static files from /browser
    server.get('*.*', express.static(distFolder, {
        maxAge: '1y',
    }));

    // All regular routes use the SSR engine
    server.get('*', (req, res, next) => {
        const host = req.headers.host || 'localhost';
        commonEngine
            .render({
                bootstrap: AppServerModule,
                documentFilePath: indexHtml,
                url: `${req.protocol}://${host}${req.originalUrl}`,
                publicPath: distFolder,
                providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
            })
            .then(html => res.send(html))
            .catch(err => next(err));
    });

    return server;
}

function run() {
    const port = process.env.PORT || 4000;

    // Start up the Node server
    const server = app();
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    run();
}

export * from './src/main.server';
