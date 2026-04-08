"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagSeguroWebhookPlugin = void 0;
exports.configurePagSeguroRoutes = configurePagSeguroRoutes;
const core_1 = require("@vendure/core");
const express_1 = require("express");
const pagseguro_payment_plugin_1 = require("./pagseguro-payment-plugin");
const loggerCtx = 'PagSeguroWebhookPlugin';
/**
 * Plugin para gerenciar webhooks do PagSeguro
 */
let PagSeguroWebhookPlugin = class PagSeguroWebhookPlugin {
    static init(options) {
        this.options = {
            webhookPath: '/api/pagseguro/webhook',
            ...options
        };
        return this;
    }
    onApplicationBootstrap() {
        core_1.Logger.info('PagSeguro Webhook Plugin inicializado', loggerCtx);
    }
};
exports.PagSeguroWebhookPlugin = PagSeguroWebhookPlugin;
PagSeguroWebhookPlugin.options = {};
exports.PagSeguroWebhookPlugin = PagSeguroWebhookPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        configuration: config => {
            // Adicionar middleware para parsing de JSON nos webhooks
            config.apiOptions.middleware = config.apiOptions.middleware || [];
            config.apiOptions.middleware.push({
                handler: (req, res, next) => {
                    // Middleware específico para webhooks do PagSeguro
                    if (req.path.includes('/pagseguro/webhook')) {
                        core_1.Logger.debug(`Webhook PagSeguro recebido: ${req.method} ${req.path}`, loggerCtx);
                    }
                    next();
                },
                route: '/pagseguro/*path'
            });
            return config;
        },
        shopApiExtensions: {
            resolvers: [],
            schema: undefined
        }
    })
], PagSeguroWebhookPlugin);
/**
 * Configuração de rotas para webhooks do PagSeguro
 */
function configurePagSeguroRoutes(app, connection) {
    const router = (0, express_1.Router)();
    // Webhook endpoint
    router.post('/webhook', async (req, res) => {
        await (0, pagseguro_payment_plugin_1.processPagSeguroWebhook)(req, res, connection);
    });
    // Status endpoint
    router.get('/webhook/status', (req, res) => {
        res.json({
            status: 'active',
            timestamp: new Date().toISOString(),
            service: 'PagSeguro Webhook'
        });
    });
    // Health check endpoint
    router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'PagSeguro Integration'
        });
    });
    app.use('/api/pagseguro', router);
    core_1.Logger.info('Rotas do PagSeguro configuradas em /api/pagseguro', loggerCtx);
}
