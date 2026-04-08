"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@vendure/core");
const vendure_config_1 = require("../vendure-config");
const loggerCtx = 'DiagnoseEligibleShippingScript';
async function main() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const connection = app.get(core_1.TransactionalConnection);
    const rcs = app.get(core_1.RequestContextService);
    const orderService = app.get(core_1.OrderService);
    const entityHydrator = app.get(core_1.EntityHydrator);
    const superadminIdentifier = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const user = await connection.rawConnection.getRepository(core_1.User).findOne({
        where: { identifier: superadminIdentifier },
    });
    const adminCtx = await rcs.create({ apiType: 'admin', user: user !== null && user !== void 0 ? user : undefined });
    const shopCtx = await rcs.create({ apiType: 'shop' });
    const orderId = process.env.ORDER_ID || '2';
    const order = await connection.rawConnection.getRepository(core_1.Order).findOne({
        where: { id: orderId },
        relations: {
            lines: { productVariant: true },
            shippingLines: { shippingMethod: true },
            surcharges: true,
        },
    });
    if (!order) {
        core_1.Logger.error(`Order não encontrado: ${orderId}`, loggerCtx);
        process.exit(1);
    }
    await entityHydrator.hydrate(adminCtx, order, {
        relations: ['surcharges', 'lines.productVariant', 'shippingLines.shippingMethod'],
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        order: {
            id: order.id,
            code: order.code,
            state: order.state,
            currencyCode: order.currencyCode,
            shippingAddress: order.shippingAddress,
            lines: (_a = order.lines) === null || _a === void 0 ? void 0 : _a.map((l) => {
                var _a, _b, _c, _d;
                return ({
                    id: l.id,
                    quantity: l.quantity,
                    sku: (_a = l.productVariant) === null || _a === void 0 ? void 0 : _a.sku,
                    variantId: (_b = l.productVariant) === null || _b === void 0 ? void 0 : _b.id,
                    customFields: (_d = (_c = l.productVariant) === null || _c === void 0 ? void 0 : _c.customFields) !== null && _d !== void 0 ? _d : null,
                });
            }),
        },
        channel: {
            id: (_c = (_b = adminCtx.channel) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null,
            code: (_e = (_d = adminCtx.channel) === null || _d === void 0 ? void 0 : _d.code) !== null && _e !== void 0 ? _e : null,
            token: (_g = (_f = adminCtx.channel) === null || _f === void 0 ? void 0 : _f.token) !== null && _g !== void 0 ? _g : null,
            defaultLanguageCode: (_j = (_h = adminCtx.channel) === null || _h === void 0 ? void 0 : _h.defaultLanguageCode) !== null && _j !== void 0 ? _j : null,
            defaultCurrencyCode: (_l = (_k = adminCtx.channel) === null || _k === void 0 ? void 0 : _k.defaultCurrencyCode) !== null && _l !== void 0 ? _l : null,
        },
    }, null, 2));
    const eligibleAdmin = await orderService.getEligibleShippingMethods(adminCtx, order.id);
    const eligibleShop = await orderService.getEligibleShippingMethods(shopCtx, order.id);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        eligibleAdminCount: (_m = eligibleAdmin === null || eligibleAdmin === void 0 ? void 0 : eligibleAdmin.length) !== null && _m !== void 0 ? _m : 0,
        eligibleShopCount: (_o = eligibleShop === null || eligibleShop === void 0 ? void 0 : eligibleShop.length) !== null && _o !== void 0 ? _o : 0,
        eligibleAdmin: (eligibleAdmin || []).map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            description: m.description,
            price: m.price,
            priceWithTax: m.priceWithTax,
        })),
        eligibleShop: (eligibleShop || []).map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            description: m.description,
            price: m.price,
            priceWithTax: m.priceWithTax,
        })),
    }, null, 2));
    process.exit(0);
}
main().catch((e) => {
    core_1.Logger.error((e === null || e === void 0 ? void 0 : e.stack) || (e === null || e === void 0 ? void 0 : e.message) || String(e), loggerCtx);
    process.exit(1);
});
