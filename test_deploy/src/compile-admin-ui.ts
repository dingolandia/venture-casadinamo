import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import path from 'path';

compileUiExtensions({
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
})
    .compile?.()
    .then(() => {
        console.log('Admin UI compiled successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to compile Admin UI:', err);
        process.exit(1);
    });