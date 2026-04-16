const fs = require('fs');
const path = require('path');

const coreFile = path.join(__dirname, 'node_modules', '@vendure', 'admin-ui', 'fesm2022', 'vendure-admin-ui-core.mjs');
const dashboardFile = path.join(__dirname, 'node_modules', '@vendure', 'admin-ui', 'fesm2022', 'vendure-admin-ui-dashboard.mjs');
const orderFile = path.join(__dirname, 'node_modules', '@vendure', 'admin-ui', 'fesm2022', 'vendure-admin-ui-order.mjs');

// Patch Core (HealthCheck endpoint under Admin UI base path)
if (fs.existsSync(coreFile)) {
    let content = fs.readFileSync(coreFile, 'utf8');
    const originalHealthCheck = "        this.healthCheckEndpoint = getServerLocation() + '/health';";
    const brokenHealthCheck = `        const derivedHealthPath = adminApiPath === 'admin-api'
            ? 'health'
            : adminApiPath.replace(/admin-api$/, 'admin/health');
        this.healthCheckEndpoint = \`\${getServerLocation()}/\${derivedHealthPath}\`;`;
    const newStr = `        const { adminApiPath } = getAppConfig();
        const derivedHealthPath = adminApiPath === 'admin-api'
            ? 'health'
            : adminApiPath.replace(/admin-api$/, 'admin/health');
        this.healthCheckEndpoint = \`\${getServerLocation()}/\${derivedHealthPath}\`;`;
    if (content.includes(originalHealthCheck) || content.includes(brokenHealthCheck)) {
        content = content
            .replace(brokenHealthCheck, newStr)
            .replace(originalHealthCheck, newStr);
        fs.writeFileSync(coreFile, content);
        console.log('Patched vendure-admin-ui-core.mjs successfully.');
    }
}

// Patch Dashboard (Intl.DateTimeFormat pt_BR)
if (fs.existsSync(dashboardFile)) {
    let content = fs.readFileSync(dashboardFile, 'utf8');
    const newStr = 'const locale = `${uiState.language}-${uiState.locale}`.replace(/_/g, \'-\').split(\'-\').slice(0, 2).join(\'-\');';
    const match = content.match(/const locale = `\$\{uiState\.language}-\$\{uiState\.locale\}`[^;]*;/);
    if (match) {
        content = content.replace(match[0], newStr);
        fs.writeFileSync(dashboardFile, content);
        console.log('Patched vendure-admin-ui-dashboard.mjs successfully.');
    }
}

// Patch Order List (Shipping Column)
if (fs.existsSync(orderFile)) {
    let content = fs.readFileSync(orderFile, 'utf8');
    const oldStr = 'return order.shippingLines.map(shippingLine => shippingLine.shippingMethod.name).join(\', \');';
    const newStr = 'return order.customFields?.selectedCarrier ? `${order.customFields.selectedCarrier} - ${order.customFields.selectedServiceCode || \'\'}` : order.shippingLines.map(shippingLine => shippingLine.shippingMethod.name).join(\', \');';
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        fs.writeFileSync(orderFile, content);
        console.log('Patched vendure-admin-ui-order.mjs successfully.');
    }
}
