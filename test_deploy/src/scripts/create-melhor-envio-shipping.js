"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@vendure/core");
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const vendure_config_1 = require("../vendure-config");
const loggerCtx = 'CreateMelhorEnvioShippingScript';
async function postJson(url, token, body) {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = https_1.default.request(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                Authorization: `Bearer ${token}`,
                'User-Agent': 'vendure-melhor-envio-script',
            },
        }, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                var _a;
                const status = (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0;
                if (status < 200 || status >= 300) {
                    reject(new Error(`Melhor Envio HTTP ${status}: ${data.slice(0, 500)}`));
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(new Error(`Melhor Envio invalid JSON: ${e.message}`));
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
function ensureTranslation(translations, targetLanguageCode, fallbackName, fallbackDescription) {
    const list = Array.isArray(translations) ? [...translations] : [];
    const has = list.some(t => t && t.languageCode === targetLanguageCode);
    if (!has) {
        list.push({
            languageCode: targetLanguageCode,
            name: fallbackName,
            description: fallbackDescription,
        });
    }
    return list;
}
async function main() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const requestContextService = app.get(core_1.RequestContextService);
    const channelService = app.get(core_1.ChannelService);
    const connection = app.get(core_1.TransactionalConnection);
    const shippingMethodService = app.get(core_1.ShippingMethodService);
    const superadminIdentifier = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const user = await connection.rawConnection.getRepository(core_1.User).findOne({
        where: { identifier: superadminIdentifier },
    });
    const ctx = await requestContextService.create({ apiType: 'admin', user: user !== null && user !== void 0 ? user : undefined });
    const calculators = shippingMethodService.getShippingCalculators(ctx);
    const hasCalculator = calculators.some((c) => c.code === 'melhor-envio');
    if (!hasCalculator) {
        core_1.Logger.error('Calculator "melhor-envio" não registrado no config', loggerCtx);
        return;
    }
    const token = process.env.MELHORENVIO_TOKEN || '';
    const fromPostalCode = process.env.MELHORENVIO_FROM_POSTAL_CODE || '';
    const allowGeneric = !token || !fromPostalCode;
    const apiUrl = process.env.MELHORENVIO_API_URL || 'https://www.melhorenvio.com.br/api/v2/me';
    const toPostalCode = process.env.MELHORENVIO_DISCOVERY_DEST || '01001000';
    const endpoint = new url_1.URL('shipment/calculate', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
    const body = {
        from: { postal_code: String(fromPostalCode).replace(/\D/g, '') },
        to: { postal_code: String(toPostalCode).replace(/\D/g, '') },
        products: [
            {
                id: 'discovery',
                width: 20,
                height: 10,
                length: 25,
                weight: 1.0,
                insurance_value: 50.0,
                quantity: 1,
            },
        ],
    };
    let quotes = [];
    if (!allowGeneric) {
        try {
            quotes = await postJson(endpoint, token, body);
        }
        catch (e) {
            core_1.Logger.error(`Falha ao consultar serviços no Melhor Envio: ${e.message}`, loggerCtx);
            return;
        }
    }
    const serviceIds = (quotes || [])
        .filter((q) => q && !q.error && q.id)
        .map((q) => ({ id: String(q.id), name: q.name || String(q.id) }));
    if (!allowGeneric && serviceIds.length === 0) {
        core_1.Logger.warn('Nenhum serviço retornado na descoberta; nada a cadastrar', loggerCtx);
        return;
    }
    const existing = await shippingMethodService.findAll(ctx, { take: 100 });
    const existingCodes = new Set((existing.items || []).map((m) => m.code));
    const checkers = shippingMethodService.getShippingEligibilityCheckers(ctx);
    const fulfillmentHandlers = shippingMethodService.getFulfillmentHandlers(ctx);
    const preferredChecker = checkers.find((c) => c.code === 'toggleable-shipping-eligibility-checker');
    const checkerDef = preferredChecker !== null && preferredChecker !== void 0 ? preferredChecker : checkers[0];
    const checkerCode = checkerDef === null || checkerDef === void 0 ? void 0 : checkerDef.code;
    const checkerArgs = [];
    if ((_a = checkerDef === null || checkerDef === void 0 ? void 0 : checkerDef.args) === null || _a === void 0 ? void 0 : _a.some((a) => a.name === 'orderMinimum')) {
        checkerArgs.push({ name: 'orderMinimum', value: '0' });
    }
    const fulfillmentHandlerCode = (_b = fulfillmentHandlers[0]) === null || _b === void 0 ? void 0 : _b.code;
    if (!checkerCode || !fulfillmentHandlerCode) {
        core_1.Logger.error('Sem checker/fulfillment handlers disponíveis', loggerCtx);
        return;
    }
    if (allowGeneric) {
        // Cria um método genérico "Melhor Envio" (calculator sem argumentos)
        const code = 'melhor-envio';
        if (!existingCodes.has(code)) {
            await shippingMethodService.create(ctx, {
                code,
                fulfillmentHandler: fulfillmentHandlerCode,
                checker: { code: checkerCode, arguments: checkerArgs },
                calculator: {
                    code: 'melhor-envio',
                    arguments: [],
                },
                translations: [
                    {
                        languageCode: core_1.LanguageCode.pt_BR,
                        name: `Melhor Envio`,
                        description: 'Cotação automática via Melhor Envio',
                    },
                    {
                        languageCode: core_1.LanguageCode.en,
                        name: `Melhor Envio`,
                        description: 'Automatic quote via Melhor Envio',
                    },
                ],
            });
            core_1.Logger.info(`ShippingMethod criado: ${code}`, loggerCtx);
        }
        else {
            core_1.Logger.info(`ShippingMethod já existe: ${code}`, loggerCtx);
        }
    }
    else {
        for (const svc of serviceIds) {
            const code = `melhor-envio-${svc.id}`;
            if (existingCodes.has(code)) {
                continue;
            }
            await shippingMethodService.create(ctx, {
                code,
                fulfillmentHandler: fulfillmentHandlerCode,
                checker: { code: checkerCode, arguments: checkerArgs },
                calculator: {
                    code: 'melhor-envio',
                    arguments: [{ name: 'serviceId', value: svc.id }],
                },
                translations: [
                    {
                        languageCode: core_1.LanguageCode.pt_BR,
                        name: `Melhor Envio - ${svc.name}`,
                        description: 'Cotação automática via Melhor Envio',
                    },
                    {
                        languageCode: core_1.LanguageCode.en,
                        name: `Melhor Envio - ${svc.name}`,
                        description: 'Automatic quote via Melhor Envio',
                    },
                ],
            });
            core_1.Logger.info(`ShippingMethod criado: ${code}`, loggerCtx);
        }
    }
    const allAfter = await shippingMethodService.findAll(ctx, { take: 200 });
    const melhorEnvioIds = [];
    for (const method of allAfter.items) {
        if (((_c = method === null || method === void 0 ? void 0 : method.calculator) === null || _c === void 0 ? void 0 : _c.code) !== 'melhor-envio')
            continue;
        melhorEnvioIds.push(method.id);
        const hasOrderMinimum = Array.isArray((_d = method === null || method === void 0 ? void 0 : method.checker) === null || _d === void 0 ? void 0 : _d.arguments) &&
            method.checker.arguments.some((a) => (a === null || a === void 0 ? void 0 : a.name) === 'orderMinimum');
        const shouldEnsureTranslations = true;
        if ((checkerArgs.length > 0 && !hasOrderMinimum) || shouldEnsureTranslations) {
            const full = await shippingMethodService.findOne(ctx, method.id);
            if (!full)
                continue;
            const baseName = (_h = (_f = (_e = ((full === null || full === void 0 ? void 0 : full.translations) || []).find((t) => (t === null || t === void 0 ? void 0 : t.languageCode) === core_1.LanguageCode.pt_BR)) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : (_g = ((full === null || full === void 0 ? void 0 : full.translations) || [])[0]) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : method.code;
            const translations = ensureTranslation(full.translations, core_1.LanguageCode.en, String(baseName), 'Automatic quote via Melhor Envio');
            await shippingMethodService.update(ctx, {
                id: full.id,
                translations,
                checker: { code: checkerCode, arguments: checkerArgs },
            });
            core_1.Logger.info(`ShippingMethod atualizado (checker args): ${method.code}`, loggerCtx);
        }
    }
    if (melhorEnvioIds.length > 0) {
        const channels = await channelService.findAll(ctx, { take: 100 });
        for (const ch of channels.items) {
            await shippingMethodService.assignShippingMethodsToChannel(ctx, {
                channelId: ch.id,
                shippingMethodIds: melhorEnvioIds,
            });
            core_1.Logger.info(`ShippingMethods atribuídos ao canal: ${ch.code}`, loggerCtx);
        }
    }
    core_1.Logger.info('Concluído', loggerCtx);
}
main()
    .then(() => process.exit(0))
    .catch((err) => {
    core_1.Logger.error((err === null || err === void 0 ? void 0 : err.message) || String(err), loggerCtx);
    process.exit(1);
});
