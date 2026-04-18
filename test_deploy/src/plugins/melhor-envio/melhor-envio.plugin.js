"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.melhorEnvioShippingCalculator = void 0;
const core_1 = require("@vendure/core");
const promises_1 = __importDefault(require("fs/promises"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const package_helper_1 = require("./package.helper");
const loggerCtx = 'MelhorEnvioPlugin';
function getConfig() {
    const apiUrl = process.env.MELHORENVIO_API_URL || 'https://www.melhorenvio.com.br/api/v2/me';
    const token = process.env.MELHORENVIO_TOKEN || '';
    const fromPostalCode = process.env.MELHORENVIO_FROM_POSTAL_CODE || '';
    return { apiUrl, token, fromPostalCode };
}
function sanitizePostalCode(value) {
    return String(value !== null && value !== void 0 ? value : '').replace(/\D/g, '');
}
function parsePriceToCents(value) {
    if (value === null || value === undefined)
        return null;
    const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(n))
        return null;
    return Math.round(n * 100);
}
function defaultCarrierLogoUrl(carrierName) {
    const raw = String(carrierName !== null && carrierName !== void 0 ? carrierName : '').trim().toLowerCase();
    if (!raw)
        return null;
    const map = {
        correios: 'correios.png',
        jadlog: 'jadlog.png',
        loggi: 'loggi.png',
        buslog: 'buslog.png',
        'total express': 'totalexpress.png',
        jet: 'jet.png',
        'azul cargo express': 'azulcargo.png',
        'latam cargo': 'latamcargo.png',
    };
    const file = map[raw];
    return file ? `https://www.melhorenvio.com.br/images/shipping-companies/${file}` : null;
}
async function appendLog(entry) {
    const projectRoot = path_1.default.resolve(__dirname, '../../../..');
    const dir = path_1.default.join(projectRoot, 'backend', 'log-melhorenvio');
    const filePath = path_1.default.join(dir, 'melhor-envio.ndjson');
    try {
        await promises_1.default.mkdir(dir, { recursive: true });
        const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
        await promises_1.default.appendFile(filePath, line, 'utf8');
    }
    catch (e) {
        core_1.Logger.error(`Falha gravando log Melhor Envio: ${(e === null || e === void 0 ? void 0 : e.message) || String(e)}`, loggerCtx);
        core_1.Logger.error(`Path: ${filePath}`, loggerCtx);
    }
}
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
                'User-Agent': 'vendure-melhor-envio',
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
const quoteCache = new Map();
exports.melhorEnvioShippingCalculator = new core_1.ShippingCalculator({
    code: 'melhor-envio',
    description: [{ languageCode: core_1.LanguageCode.pt_BR, value: 'Cotação via Melhor Envio' }],
    args: {
        serviceId: {
            type: 'string',
            label: [{ languageCode: core_1.LanguageCode.pt_BR, value: 'Service ID (Melhor Envio)' }],
            required: false,
        },
        carrierName: {
            type: 'string',
            label: [{ languageCode: core_1.LanguageCode.pt_BR, value: 'Transportadora (opcional)' }],
            required: false,
        },
    },
    calculate: async (ctx, order, args) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        const { apiUrl, token, fromPostalCode } = getConfig();
        await appendLog({
            type: 'enter',
            orderId: order.id,
            orderCode: order === null || order === void 0 ? void 0 : order.code,
            serviceId: String((_a = args === null || args === void 0 ? void 0 : args.serviceId) !== null && _a !== void 0 ? _a : '').trim(),
            channelCode: (_c = (_b = ctx === null || ctx === void 0 ? void 0 : ctx.channel) === null || _b === void 0 ? void 0 : _b.code) !== null && _c !== void 0 ? _c : null,
        });
        if (!token) {
            core_1.Logger.warn('MELHORENVIO_TOKEN não configurado', loggerCtx);
            await appendLog({ type: 'skip', reason: 'missing_token', orderId: order.id });
            return undefined;
        }
        const from = sanitizePostalCode(fromPostalCode);
        const to = sanitizePostalCode((_d = order.shippingAddress) === null || _d === void 0 ? void 0 : _d.postalCode);
        if (!from || from.length < 8 || !to || to.length < 8) {
            await appendLog({
                type: 'skip',
                reason: 'invalid_postal_code',
                orderId: order.id,
                fromPostalCode: fromPostalCode,
                toPostalCode: (_e = order.shippingAddress) === null || _e === void 0 ? void 0 : _e.postalCode,
            });
            return undefined;
        }
        const pkg = (0, package_helper_1.buildPackageFromOrder)(order);
        const serviceId = String((_f = args.serviceId) !== null && _f !== void 0 ? _f : '').trim();
        const cacheKey = `${order.id}:${(_g = order.updatedAt) !== null && _g !== void 0 ? _g : ''}:${to}:${serviceId}:${pkg.weightKg}:${pkg.lengthCm}:${pkg.widthCm}:${pkg.heightCm}:${pkg.insuranceValueBRL}`;
        const cached = quoteCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            await appendLog({
                type: 'cache_hit',
                orderId: order.id,
                toPostalCode: to,
                serviceId,
                priceCents: cached.priceCents,
            });
            return {
                price: cached.priceCents,
                priceIncludesTax: false,
                taxRate: 0,
                metadata: cached.metadata,
            };
        }
        const endpoint = new url_1.URL('shipment/calculate', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
        const body = {
            from: { postal_code: from },
            to: { postal_code: to },
            products: [
                {
                    id: String((_j = (_h = order.code) !== null && _h !== void 0 ? _h : order.id) !== null && _j !== void 0 ? _j : 'order'),
                    width: pkg.widthCm,
                    height: pkg.heightCm,
                    length: pkg.lengthCm,
                    weight: pkg.weightKg,
                    insurance_value: pkg.insuranceValueBRL,
                    quantity: 1,
                },
            ],
        };
        await appendLog({
            type: 'request',
            orderId: order.id,
            orderCode: order.code,
            endpoint: endpoint.toString(),
            serviceId,
            orderLines: pkg.orderLines,
            usedDefaults: pkg.usedDefaults,
            payload: body,
        });
        let match;
        try {
            const quotes = await postJson(endpoint, token, body);
            await appendLog({
                type: 'response',
                orderId: order.id,
                serviceId,
                response: quotes,
            });
            if (serviceId) {
                match = (quotes || []).find((q) => { var _a; return String((_a = q.id) !== null && _a !== void 0 ? _a : '') === serviceId; });
                if (!match) {
                    const candidates = (quotes || []).filter((q) => !q.error && q.price != null);
                    if (candidates.length > 0) {
                        candidates.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
                        match = candidates[0];
                    }
                }
            }
            else {
                const candidates = (quotes || []).filter((q) => !q.error && q.price != null);
                if (candidates.length > 0) {
                    candidates.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
                    match = candidates[0];
                }
            }
        }
        catch (e) {
            core_1.Logger.warn(`Falha cotando Melhor Envio: ${e.message}`, loggerCtx);
            await appendLog({
                type: 'error',
                orderId: order.id,
                serviceId,
                message: e === null || e === void 0 ? void 0 : e.message,
                stack: e === null || e === void 0 ? void 0 : e.stack,
            });
            return undefined;
        }
        if (!match || match.error) {
            core_1.Logger.warn('Serviço Melhor Envio não disponível para o endereço atual', loggerCtx);
            await appendLog({
                type: 'no_match',
                orderId: order.id,
                serviceId,
                match,
            });
            return undefined;
        }
        const priceCents = parsePriceToCents(match.price);
        if (priceCents === null) {
            await appendLog({
                type: 'invalid_price',
                orderId: order.id,
                serviceId,
                match,
            });
            return undefined;
        }
        const carrierName = (_m = (_l = (_k = match.company) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : args.carrierName) !== null && _m !== void 0 ? _m : null;
        const carrierLogoUrl = (_p = (_o = match.company) === null || _o === void 0 ? void 0 : _o.picture) !== null && _p !== void 0 ? _p : defaultCarrierLogoUrl(carrierName);
        const metadata = {
            melhorEnvio: {
                serviceId: serviceId || String((_q = match.id) !== null && _q !== void 0 ? _q : ''),
                serviceName: (_r = match.name) !== null && _r !== void 0 ? _r : null,
                carrierName,
                carrierLogoUrl,
                deliveryTimeDays: (_s = match.delivery_time) !== null && _s !== void 0 ? _s : null,
            },
        };
        quoteCache.set(cacheKey, { priceCents, expiresAt: Date.now() + 30000, metadata });
        await appendLog({
            type: 'result',
            orderId: order.id,
            serviceId,
            priceCents,
            metadata,
        });
        return {
            price: priceCents,
            priceIncludesTax: false,
            taxRate: 0,
            metadata,
        };
    },
});
void appendLog({
    type: 'module_loaded',
    pid: process.pid,
});
