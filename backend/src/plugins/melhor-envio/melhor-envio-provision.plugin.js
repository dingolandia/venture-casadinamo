"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MelhorEnvioProvisionPlugin = void 0;
const core_1 = require("@vendure/core");
const loggerCtx = 'MelhorEnvioProvisionPlugin';
function getServiceIdFromEnv() {
    var _a;
    const value = String((_a = process.env.MELHORENVIO_DEFAULT_SERVICE_ID) !== null && _a !== void 0 ? _a : '').trim();
    return value ? value : null;
}
class MelhorEnvioProvisionService {
    constructor(requestContextService, shippingMethodService) {
        this.requestContextService = requestContextService;
        this.shippingMethodService = shippingMethodService;
    }
    async onApplicationBootstrap() {
        var _a, _b;
        const serviceId = getServiceIdFromEnv();
        if (!serviceId) {
            core_1.Logger.warn('MELHORENVIO_DEFAULT_SERVICE_ID não configurado; não vou criar ShippingMethod', loggerCtx);
            return;
        }
        const ctx = await this.requestContextService.create({ apiType: 'admin' });
        const existing = await this.shippingMethodService.findAll(ctx, { take: 100 });
        const alreadyHasMelhorEnvio = (existing.items || []).some((m) => { var _a; return ((_a = m.calculator) === null || _a === void 0 ? void 0 : _a.code) === 'melhor-envio'; });
        if (alreadyHasMelhorEnvio) {
            return;
        }
        const calculators = this.shippingMethodService.getShippingCalculators(ctx);
        const hasCalculator = calculators.some(c => c.code === 'melhor-envio');
        if (!hasCalculator) {
            core_1.Logger.error('ShippingCalculator "melhor-envio" não está registrado no config', loggerCtx);
            return;
        }
        const checkers = this.shippingMethodService.getShippingEligibilityCheckers(ctx);
        const fulfillmentHandlers = this.shippingMethodService.getFulfillmentHandlers(ctx);
        const preferredChecker = checkers.find((c) => c.code === 'toggleable-shipping-eligibility-checker');
        const checkerDef = preferredChecker !== null && preferredChecker !== void 0 ? preferredChecker : checkers[0];
        const checkerCode = checkerDef === null || checkerDef === void 0 ? void 0 : checkerDef.code;
        const checkerArgs = [];
        if ((_a = checkerDef === null || checkerDef === void 0 ? void 0 : checkerDef.args) === null || _a === void 0 ? void 0 : _a.some((a) => a.name === 'orderMinimum')) {
            checkerArgs.push({ name: 'orderMinimum', value: '0' });
        }
        const fulfillmentHandlerCode = (_b = fulfillmentHandlers[0]) === null || _b === void 0 ? void 0 : _b.code;
        if (!checkerCode || !fulfillmentHandlerCode) {
            core_1.Logger.error('Sem checker/fulfillment handlers disponíveis para criar ShippingMethod', loggerCtx);
            return;
        }
        await this.shippingMethodService.create(ctx, {
            code: 'melhor-envio',
            fulfillmentHandler: fulfillmentHandlerCode,
            checker: {
                code: checkerCode,
                arguments: checkerArgs,
            },
            calculator: {
                code: 'melhor-envio',
                arguments: [{ name: 'serviceId', value: serviceId }],
            },
            translations: [
                {
                    languageCode: core_1.LanguageCode.pt_BR,
                    name: 'Melhor Envio',
                    description: 'Cotação automática via Melhor Envio',
                },
            ],
        });
        core_1.Logger.info('ShippingMethod "Melhor Envio" criado automaticamente', loggerCtx);
    }
}
let MelhorEnvioProvisionPlugin = class MelhorEnvioProvisionPlugin {
};
exports.MelhorEnvioProvisionPlugin = MelhorEnvioProvisionPlugin;
exports.MelhorEnvioProvisionPlugin = MelhorEnvioProvisionPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        providers: [MelhorEnvioProvisionService],
    })
], MelhorEnvioProvisionPlugin);
