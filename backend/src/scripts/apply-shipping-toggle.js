"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@vendure/core");
const vendure_config_1 = require("../vendure-config");
const loggerCtx = 'ApplyShippingToggleScript';
function ensureOrderMinimumArg(args) {
    const list = Array.isArray(args) ? [...args] : [];
    const has = list.some(a => (a === null || a === void 0 ? void 0 : a.name) === 'orderMinimum');
    if (!has) {
        list.push({ name: 'orderMinimum', value: '0' });
    }
    return list;
}
async function main() {
    var _a, _b, _c;
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const requestContextService = app.get(core_1.RequestContextService);
    const connection = app.get(core_1.TransactionalConnection);
    const shippingMethodService = app.get(core_1.ShippingMethodService);
    const superadminIdentifier = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const user = await connection.rawConnection.getRepository(core_1.User).findOne({
        where: { identifier: superadminIdentifier },
    });
    const ctx = await requestContextService.create({ apiType: 'admin', user: user !== null && user !== void 0 ? user : undefined });
    const all = await shippingMethodService.findAll(ctx, { take: 500 });
    for (const method of all.items) {
        const full = await shippingMethodService.findOne(ctx, method.id);
        if (!full)
            continue;
        const currentCode = String((_b = (_a = full === null || full === void 0 ? void 0 : full.checker) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : '');
        if (currentCode === 'toggleable-shipping-eligibility-checker')
            continue;
        const args = ensureOrderMinimumArg((_c = full === null || full === void 0 ? void 0 : full.checker) === null || _c === void 0 ? void 0 : _c.arguments);
        await shippingMethodService.update(ctx, {
            id: full.id,
            translations: full.translations,
            checker: {
                code: 'toggleable-shipping-eligibility-checker',
                arguments: args,
            },
        });
        core_1.Logger.info(`Atualizado checker -> toggleable: ${method.code}`, loggerCtx);
    }
    core_1.Logger.info('Concluído', loggerCtx);
    process.exit(0);
}
main().catch((err) => {
    core_1.Logger.error((err === null || err === void 0 ? void 0 : err.message) || String(err), loggerCtx);
    process.exit(1);
});
