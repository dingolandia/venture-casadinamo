const path = require('path');
const { compileUiExtensions } = require('@vendure/ui-devkit/compiler');

async function main() {
    const config = compileUiExtensions({
        outputPath: path.join(__dirname, '__admin-ui'),
        extensions: [
            {
                id: 'custom-logo',
                extensionPath: path.join(__dirname, 'src', 'ui-assets'),
                staticAssets: [
                    path.join(__dirname, 'src', 'ui-assets', 'logo-700.webp'),
                    path.join(__dirname, 'src', 'ui-assets', 'logo-300.webp'),
                    path.join(__dirname, 'src', 'ui-assets', 'logo-700@2x.webp'),
                    path.join(__dirname, 'src', 'ui-assets', 'logo-300@2x.webp'),
                    path.join(__dirname, 'src', 'ui-assets', 'logo-top.webp'),
                ],
                translations: {
                    pt_BR: path.join(__dirname, 'src', 'ui-extensions', 'pt_BR.json'),
                },
                globalStyles: path.join(__dirname, 'src', 'ui-extensions', 'custom-styles.scss'),
            },
        ],
        command: 'npm',
    });

    if (typeof config.compile === 'function') {
        await config.compile();
    }
}

main().catch(error => {
    console.error('Failed to compile Admin UI:', error);
    process.exit(1);
});
