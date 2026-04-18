"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagSeguroApiPlugin = void 0;
const core_1 = require("@vendure/core");
const express_1 = __importStar(require("express"));
const loggerCtx = 'PagSeguroApiPlugin';
function getConfig() {
    const apiUrl = process.env.PAGSEGURO_API_URL || 'https://sandbox.api.pagseguro.com';
    const token = process.env.PAGSEGURO_TOKEN || '';
    return { apiUrl, token };
}
function cors(req, res, next) {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
}
async function forward(req, res, path, method) {
    const { apiUrl, token } = getConfig();
    if (!token) {
        core_1.Logger.error('PAGSEGURO_TOKEN não definido no backend', loggerCtx);
        return res.status(500).json({ message: 'PagSeguro token não configurado no servidor' });
    }
    const url = `${apiUrl}${path}`;
    try {
        const init = {
            method,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        };
        if (req.body && method !== 'GET') {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(req.body);
        }
        const response = await fetch(url, init);
        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        }
        catch {
            data = { raw: text };
        }
        if (!response.ok) {
            core_1.Logger.warn(`Erro PagSeguro ${method} ${path}: ${response.status} ${response.statusText} - ${text}`, loggerCtx);
            return res.status(response.status).json(data || { message: 'Erro na API PagSeguro' });
        }
        return res.status(200).json(data);
    }
    catch (err) {
        core_1.Logger.error(`Falha ao chamar PagSeguro ${method} ${path}: ${(err === null || err === void 0 ? void 0 : err.message) || err}`, loggerCtx);
        return res.status(502).json({ message: 'Falha ao contatar PagSeguro', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
}
function createRouter() {
    const router = (0, express_1.Router)();
    router.use(express_1.default.json({ limit: '2mb' }));
    router.use(cors);
    router.get('/health', async (_req, res) => {
        const { apiUrl } = getConfig();
        res.json({ ok: true, service: 'pagseguro', target: apiUrl });
    });
    // Charges
    router.post('/charges', (req, res) => forward(req, res, '/charges', 'POST'));
    router.get('/charges/:id', (req, res) => forward(req, res, `/charges/${req.params.id}`, 'GET'));
    // Orders (Checkout)
    router.post('/orders', (req, res) => forward(req, res, '/orders', 'POST'));
    return router;
}
let PagSeguroApiPlugin = class PagSeguroApiPlugin {
};
exports.PagSeguroApiPlugin = PagSeguroApiPlugin;
exports.PagSeguroApiPlugin = PagSeguroApiPlugin = __decorate([
    (0, core_1.VendurePlugin)({
        imports: [core_1.PluginCommonModule],
        configuration: (config) => {
            const router = createRouter();
            config.apiOptions.middleware = config.apiOptions.middleware || [];
            config.apiOptions.middleware.push({ route: '/api/pagseguro', handler: router });
            core_1.Logger.info('PagSeguro API proxy montado em /api/pagseguro', loggerCtx);
            return config;
        },
    })
], PagSeguroApiPlugin);
