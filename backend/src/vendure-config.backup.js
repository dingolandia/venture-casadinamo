"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const core_1 = require("@vendure/core");
const email_plugin_1 = require("@vendure/email-plugin");
const asset_server_plugin_1 = require("@vendure/asset-server-plugin");
const admin_ui_plugin_1 = require("@vendure/admin-ui-plugin");
const graphiql_plugin_1 = require("@vendure/graphiql-plugin");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debugLogPath = path_1.default.join(__dirname, "../../tmp/bootstrap-config.log");
function appendConfigDebug(message, details) {
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(debugLogPath), { recursive: true });
        const suffix = details ? ` ${typeof details === 'string' ? details : JSON.stringify(details)}` : '';
        fs_1.default.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${message}${suffix}\n`);
    }
    catch (_a) { }
}
const dotenvPathCandidates = [
    path_1.default.join(__dirname, "../.env"),
    path_1.default.join(__dirname, "../../.env"),
];
const dotenvPath = dotenvPathCandidates.find(candidate => fs_1.default.existsSync(candidate));
require("dotenv").config(dotenvPath ? { path: dotenvPath } : undefined);
appendConfigDebug('dotenv resolved', {
    dotenvPath: dotenvPath !== null && dotenvPath !== void 0 ? dotenvPath : null,
    cwd: process.cwd(),
    dirname: __dirname,
    port: process.env.PORT || null,
    appEnv: process.env.APP_ENV || null,
    dbType: process.env.DB_TYPE || null,
    dbHost: process.env.DB_HOST || null,
    dbName: process.env.DB_NAME || null,
    dbUsername: process.env.DB_USERNAME || null,
});
const pagseguro_payment_plugin_1 = require("./plugins/pagseguro-payment-plugin");
const pagseguro_webhook_plugin_1 = require("./plugins/pagseguro-webhook-plugin");
const pagseguro_api_plugin_1 = require("./plugins/pagseguro-api-plugin");
const image_watermark_plugin_1 = require("./plugins/image-watermark.plugin");
const melhor_envio_plugin_1 = require("./plugins/melhor-envio/melhor-envio.plugin");
const melhor_envio_provision_plugin_1 = require("./plugins/melhor-envio/melhor-envio-provision.plugin");
const toggleable_shipping_eligibility_checker_1 = require("./plugins/shipping-toggle/toggleable-shipping-eligibility-checker");
const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;
const dbType = process.env.DB_TYPE || 'better-sqlite3';
const isPostgres = dbType === 'postgres';
const dbConnectionOptions = isPostgres
    ? {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: +(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        synchronize: false,
        migrations: [path_1.default.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
    : {
        type: 'better-sqlite3',
        synchronize: false,
        migrations: [path_1.default.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: path_1.default.join(__dirname, '../vendure.sqlite'),
    };
exports.config = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions,
    paymentOptions: {
        paymentMethodHandlers: [
            core_1.dummyPaymentHandler,
            pagseguro_payment_plugin_1.pagSeguroPaymentHandler
        ],
    },
    shippingOptions: {
        shippingEligibilityCheckers: [core_1.defaultShippingEligibilityChecker, toggleable_shipping_eligibility_checker_1.toggleableShippingEligibilityChecker],
        shippingCalculators: [core_1.defaultShippingCalculator, melhor_envio_plugin_1.melhorEnvioShippingCalculator],
        fulfillmentHandlers: [core_1.manualFulfillmentHandler],
    },
    customFields: {
        ShippingMethod: [
            {
                name: 'storefrontEnabled',
                type: 'boolean',
                label: [
                    { languageCode: 'en', value: 'Enabled in storefront' },
                    { languageCode: 'pt_BR', value: 'Ativo no storefront' },
                ],
                description: [
                    { languageCode: 'en', value: 'Controls whether this shipping method appears in checkout' },
                    { languageCode: 'pt_BR', value: 'Controla se este método de envio aparece no checkout' },
                ],
                nullable: false,
                defaultValue: true,
                ui: { component: 'boolean-form-input', tab: 'Exibição' },
            },
        ],
        ProductVariant: [
            {
                name: 'weightKg',
                type: 'float',
                label: [{ languageCode: 'pt_BR', value: 'Peso (kg)' }],
                description: [{ languageCode: 'pt_BR', value: 'Peso da unidade em quilogramas.' }],
                nullable: false,
                defaultValue: 0.0,
                ui: { component: 'number-form-input', options: { min: 0, step: 0.001 }, tab: 'Dados para frete' },
            },
            {
                name: 'lengthCm',
                type: 'float',
                label: [{ languageCode: 'pt_BR', value: 'Comprimento (cm)' }],
                description: [{ languageCode: 'pt_BR', value: 'Comprimento da unidade em centímetros.' }],
                nullable: false,
                defaultValue: 0.0,
                ui: { component: 'number-form-input', options: { min: 0, step: 0.1 }, tab: 'Dados para frete' },
            },
            {
                name: 'widthCm',
                type: 'float',
                label: [{ languageCode: 'pt_BR', value: 'Largura (cm)' }],
                description: [{ languageCode: 'pt_BR', value: 'Largura da unidade em centímetros.' }],
                nullable: false,
                defaultValue: 0.0,
                ui: { component: 'number-form-input', options: { min: 0, step: 0.1 }, tab: 'Dados para frete' },
            },
            {
                name: 'heightCm',
                type: 'float',
                label: [{ languageCode: 'pt_BR', value: 'Altura (cm)' }],
                description: [{ languageCode: 'pt_BR', value: 'Altura da unidade em centímetros.' }],
                nullable: false,
                defaultValue: 0.0,
                ui: { component: 'number-form-input', options: { min: 0, step: 0.1 }, tab: 'Dados para frete' },
            },
            {
                name: 'declaredValue',
                type: 'float',
                label: [{ languageCode: 'pt_BR', value: 'Valor declarado (R$)' }],
                description: [{ languageCode: 'pt_BR', value: 'Usado para seguro no cálculo do frete (opcional).' }],
                nullable: true,
                ui: { component: 'currency-form-input', options: { currencyCode: 'BRL' }, tab: 'Dados para frete' },
            },
        ],
        Order: [
            { name: 'selectedServiceCode', type: 'string', nullable: true },
            { name: 'selectedCarrier', type: 'string', nullable: true },
            { name: 'selectedShippingPrice', type: 'int', nullable: true },
        ],
    },
    plugins: [
        graphiql_plugin_1.GraphiqlPlugin.init(),
        asset_server_plugin_1.AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path_1.default.join(__dirname, '../static/assets'),
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
            previewStrategy: new image_watermark_plugin_1.WatermarkPreviewStrategy(),
        }),
        image_watermark_plugin_1.ImageWatermarkPlugin,
        core_1.DefaultSchedulerPlugin.init(),
        core_1.DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        core_1.DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        email_plugin_1.EmailPlugin.init({
            devMode: true,
            outputPath: path_1.default.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: email_plugin_1.defaultEmailHandlers,
            templateLoader: new email_plugin_1.FileBasedTemplateLoader(path_1.default.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            route: 'admin',
            port: serverPort + 2,
            adminUiConfig: {
                apiPort: serverPort,
            },
        }),
        pagseguro_webhook_plugin_1.PagSeguroWebhookPlugin.init({
            webhookPath: '/api/pagseguro/webhook'
        }),
        pagseguro_api_plugin_1.PagSeguroApiPlugin,
        melhor_envio_provision_plugin_1.MelhorEnvioProvisionPlugin,
    ],
};
