import type { VendureConfig } from '@vendure/core';
import { LanguageCode } from '@vendure/core';
import fs from 'fs';
import path from 'path';

import { config as configFromBackup } from './vendure-config.backup.js';

const ADMIN_UI_OUTPUT_CANDIDATES = [
    path.join(__dirname, '../__admin-ui/dist/browser'),
    path.join(__dirname, '../__admin-ui/dist'),
    path.join(__dirname, '../../__admin-ui/dist/browser'),
    path.join(__dirname, '../../__admin-ui/dist'),
];

const serverPort = +(process.env.PORT || 3000);

function resolveCompiledAdminUiPath(): string | undefined {
    return ADMIN_UI_OUTPUT_CANDIDATES.find(candidate =>
        fs.existsSync(path.join(candidate, 'index.html')),
    );
}

function getAdminUiApp() {
    const compiledAdminUiPath = resolveCompiledAdminUiPath();
    if (compiledAdminUiPath) {
        console.log('[admin-ui] using compiled app at', compiledAdminUiPath);
        return { path: compiledAdminUiPath };
    }

    if (process.env.APP_ENV === 'dev') {
        console.log('[admin-ui] compiled app not found, compiling in dev mode');
        const { compileUiExtensions } = require('@vendure/ui-devkit/compiler');
        return compileUiExtensions({
            outputPath: path.join(__dirname, '../__admin-ui'),
            extensions: [
                {
                    id: 'custom-logo',
                    extensionPath: path.join(__dirname, 'ui-assets'),
                    staticAssets: [
                        path.join(__dirname, 'ui-assets', 'logo-700.webp'),
                        path.join(__dirname, 'ui-assets', 'logo-300.webp'),
                        path.join(__dirname, 'ui-assets', 'logo-700@2x.webp'),
                        path.join(__dirname, 'ui-assets', 'logo-300@2x.webp'),
                        path.join(__dirname, 'ui-assets', 'logo-top.webp'),
                    ],
                    translations: {
                        pt_BR: path.join(__dirname, 'ui-extensions', 'pt_BR.json'),
                    },
                    globalStyles: path.join(__dirname, 'ui-extensions', 'custom-styles.scss'),
                },
            ],
            command: 'npm',
            devMode: true,
        });
    }

    console.warn('[admin-ui] compiled app not found; falling back to default Admin UI');
    return undefined;
}

// Forca o idioma default para Portugues Brasileiro nas configuracoes globais.
(configFromBackup as VendureConfig).defaultLanguageCode = LanguageCode.pt_BR;

if (configFromBackup.plugins) {
    for (let i = 0; i < configFromBackup.plugins.length; i++) {
        const plugin = configFromBackup.plugins[i];
        if (plugin.name === 'AdminUiPlugin' || plugin.constructor?.name === 'AdminUiPlugin') {
            const { AdminUiPlugin } = require('@vendure/admin-ui-plugin');
            const adminUiApp = getAdminUiApp();

            configFromBackup.plugins[i] = AdminUiPlugin.init({
                route: 'admin',
                port: serverPort + 2,
                adminUiConfig: {
                    apiPort: serverPort,
                    brand: 'Casa Dinamo',
                    hideVendureBranding: false,
                    hideVersion: true,
                    defaultLanguage: LanguageCode.pt_BR,
                },
                ...(adminUiApp ? { app: adminUiApp } : {}),
            });
            break;
        }
    }
}

export const config = configFromBackup as VendureConfig;
