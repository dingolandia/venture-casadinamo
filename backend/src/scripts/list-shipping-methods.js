"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@vendure/core");
const vendure_config_1 = require("../vendure-config");
async function main() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const rcs = app.get(core_1.RequestContextService);
    const sms = app.get(core_1.ShippingMethodService);
    const cs = app.get(core_1.ChannelService);
    const connection = app.get(core_1.TransactionalConnection);
    const superadminIdentifier = process.env.SUPERADMIN_USERNAME || 'superadmin';
    const user = await connection.rawConnection.getRepository(core_1.User).findOne({
        where: { identifier: superadminIdentifier },
    });
    const ctx = await rcs.create({ apiType: 'admin', user: user !== null && user !== void 0 ? user : undefined });
    const allTables = await connection.rawConnection.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC;");
    const shippingTables = await connection.rawConnection.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%shipping%';");
    const zoneTables = await connection.rawConnection.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%zone%';");
    const shippingZoneJoinTables = await connection.rawConnection.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%shipping%' AND name LIKE '%zone%';");
    const shippingMethodColumns = await connection.rawConnection.query("PRAGMA table_info('shipping_method');");
    const shippingMethodRows = await connection.rawConnection.query("SELECT * FROM shipping_method ORDER BY id ASC LIMIT 50;");
    const shippingMethodTranslationColumns = await connection.rawConnection.query("PRAGMA table_info('shipping_method_translation');");
    const shippingMethodTranslationRows = await connection.rawConnection.query('SELECT * FROM shipping_method_translation LIMIT 200;');
    const channelColumns = await connection.rawConnection.query("PRAGMA table_info('channel');");
    const channelRows = await connection.rawConnection.query("SELECT * FROM channel ORDER BY id ASC LIMIT 50;");
    const zoneColumns = await connection.rawConnection.query("PRAGMA table_info('zone');");
    const zoneRows = await connection.rawConnection.query("SELECT * FROM zone ORDER BY id ASC LIMIT 50;");
    const zoneMembersColumns = await connection.rawConnection.query("PRAGMA table_info('zone_members_region');");
    const zoneMembersRows = await connection.rawConnection.query("SELECT * FROM zone_members_region ORDER BY zoneId ASC LIMIT 200;");
    const methods = await sms.findAll(ctx, { take: 500 });
    const channels = await cs.findAll(ctx, { take: 100 });
    const channelMap = new Map();
    for (const ch of channels.items)
        channelMap.set(ch.id, ch);
    const out = [];
    for (const m of methods.items) {
        const full = await sms.findOne(ctx, m.id);
        const sz = (_a = full === null || full === void 0 ? void 0 : full.shippingZone) !== null && _a !== void 0 ? _a : null;
        out.push({
            id: m.id,
            code: m.code,
            name: (_d = (_c = (_b = m.translations) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null,
            enabled: (_f = (_e = full === null || full === void 0 ? void 0 : full.enabled) !== null && _e !== void 0 ? _e : m === null || m === void 0 ? void 0 : m.enabled) !== null && _f !== void 0 ? _f : null,
            calculator: (_h = (_g = m.calculator) === null || _g === void 0 ? void 0 : _g.code) !== null && _h !== void 0 ? _h : null,
            checker: (_k = (_j = m.checker) === null || _j === void 0 ? void 0 : _j.code) !== null && _k !== void 0 ? _k : null,
            shippingZone: sz
                ? {
                    id: sz.id,
                    name: (_l = sz.name) !== null && _l !== void 0 ? _l : null,
                }
                : null,
            channels: (m.channels || []).map((ch) => {
                var _a, _b, _c, _d;
                return ({
                    id: ch.id,
                    code: (_b = (_a = channelMap.get(ch.id)) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : null,
                    token: (_d = (_c = channelMap.get(ch.id)) === null || _c === void 0 ? void 0 : _c.token) !== null && _d !== void 0 ? _d : null,
                });
            }),
        });
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        allTables,
        tables: shippingTables,
        zoneTables,
        shippingZoneJoinTables,
        channel: {
            columns: channelColumns,
            rows: channelRows,
        },
        zone: {
            columns: zoneColumns,
            rows: zoneRows,
            members_columns: zoneMembersColumns,
            members_rows: zoneMembersRows,
        },
        shipping_method: {
            columns: shippingMethodColumns,
            rows: shippingMethodRows,
        },
        shipping_method_translation: {
            columns: shippingMethodTranslationColumns,
            rows: shippingMethodTranslationRows,
        },
        count: out.length,
        methods: out,
    }, null, 2));
    process.exit(0);
}
main().catch(err => {
    // eslint-disable-next-line no-console
    console.error((err === null || err === void 0 ? void 0 : err.message) || String(err));
    process.exit(1);
});
