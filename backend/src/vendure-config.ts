import type { VendureConfig } from '@vendure/core';
import { LanguageCode } from '@vendure/core';
import { config as configFromBackup } from './vendure-config.backup.js';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import path from 'path';

// Força o idioma default para Português Brasileiro nas configurações globais
(configFromBackup as VendureConfig).defaultLanguageCode = LanguageCode.pt_BR;

console.log('vendure-config.ts loaded, plugins count:', configFromBackup.plugins?.length);

if (configFromBackup.plugins) {
    for (let i = 0; i < configFromBackup.plugins.length; i++) {
        const plugin = configFromBackup.plugins[i];
        console.log(`Checking plugin ${i}:`, plugin.name, plugin.constructor?.name);
        if (plugin.name === 'AdminUiPlugin' || plugin.constructor?.name === 'AdminUiPlugin') {
            const { AdminUiPlugin } = require('@vendure/admin-ui-plugin');
            configFromBackup.plugins[i] = AdminUiPlugin.init({
                route: 'admin',
                port: 3002,
                adminUiConfig: {
                    apiPort: 3000,
                    brand: 'Casa Dínamo',
                    hideVendureBranding: false,
                    hideVersion: true,
                    defaultLanguage: LanguageCode.pt_BR,
                },
                app: (() => {
                    const config = compileUiExtensions({
                        outputPath: path.join(__dirname, '../__admin-ui'),
                        extensions: [{
                            id: 'custom-logo',
                            extensionPath: path.join(__dirname, 'ui-assets'),
                            staticAssets: [
                                path.join(__dirname, 'ui-assets', 'logo.png'),
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
                            }],
                            command: 'npm',
                    });
                    (config as any).path = path.join(__dirname, '../__admin-ui/dist/browser');
                    return config;
                })(),
            });
            console.log('--- REPLACED ADMIN UI PLUGIN ---');
            console.log((configFromBackup.plugins[i] as any).options);
            break;
        }
    }
}

export const config = configFromBackup as VendureConfig;
