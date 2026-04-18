"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Database = require('better-sqlite3');
function nowStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function getDbPath() {
    const argIdx = process.argv.findIndex(a => a === '--db');
    if (argIdx !== -1 && process.argv[argIdx + 1]) {
        return path_1.default.resolve(process.cwd(), process.argv[argIdx + 1]);
    }
    return path_1.default.resolve(__dirname, '../../vendure.sqlite');
}
function snapshot(db) {
    var _a, _b;
    const globalSettings = db.prepare('SELECT id, availableLanguages FROM global_settings ORDER BY id').all();
    const channels = db.prepare('SELECT id, code, defaultLanguageCode, availableLanguageCodes, defaultCurrencyCode, availableCurrencyCodes, defaultTaxZoneId, defaultShippingZoneId FROM channel ORDER BY id').all();
    const zones = db.prepare('SELECT id, name FROM zone ORDER BY id').all();
    const countries = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabledCount FROM region WHERE type = 'country'").get();
    const brazil = db.prepare("SELECT id, enabled FROM region WHERE type = 'country' AND code = 'BR'").get();
    const zonesContainingBrazil = db.prepare("SELECT z.id as id, z.name as name FROM zone z INNER JOIN zone_members_region zm ON zm.zoneId = z.id INNER JOIN region r ON r.id = zm.regionId WHERE r.type = 'country' AND r.code = 'BR' ORDER BY z.id").all();
    return {
        globalSettings,
        channels,
        zones,
        countries: { total: (_a = countries.total) !== null && _a !== void 0 ? _a : 0, enabledCount: (_b = countries.enabledCount) !== null && _b !== void 0 ? _b : 0 },
        brazil: brazil ? { id: brazil.id, enabled: brazil.enabled } : null,
        zonesContainingBrazil,
    };
}
function main() {
    const dbPath = getDbPath();
    if (!fs_1.default.existsSync(dbPath)) {
        throw new Error(`SQLite não encontrado em: ${dbPath}`);
    }
    const dryRun = process.argv.includes('--dry-run');
    const shouldBackup = !process.argv.includes('--no-backup');
    if (shouldBackup && !dryRun) {
        const backupPath = `${dbPath}.bak-${nowStamp()}`;
        fs_1.default.copyFileSync(dbPath, backupPath);
        process.stdout.write(`Backup criado: ${backupPath}\n`);
    }
    const db = new Database(dbPath);
    try {
        const before = snapshot(db);
        process.stdout.write(`Snapshot (antes):\n${JSON.stringify(before, null, 2)}\n`);
        if (dryRun) {
            process.stdout.write('Dry-run: nenhuma alteração aplicada.\n');
            return;
        }
        if (!before.brazil) {
            throw new Error("Não encontrei o país BR em region (type='country', code='BR').");
        }
        const defaultChannel = before.channels.find(c => c.code === '__default_channel__');
        if (!defaultChannel) {
            throw new Error("Não encontrei o channel '__default_channel__'.");
        }
        const zoneIdForBrazil = (() => {
            const americas = before.zones.find(z => z.name === 'Americas');
            if (americas)
                return americas.id;
            if (before.zonesContainingBrazil.length > 0)
                return before.zonesContainingBrazil[0].id;
            return null;
        })();
        if (!zoneIdForBrazil) {
            throw new Error("Não encontrei uma zone que contenha BR (nem uma zone chamada 'Americas').");
        }
        let updatedVariantPrices = 0;
        db.transaction(() => {
            var _a;
            db.prepare("UPDATE global_settings SET availableLanguages = 'pt_BR'").run();
            db.prepare("UPDATE channel SET defaultLanguageCode = 'pt_BR', availableLanguageCodes = 'pt_BR', defaultCurrencyCode = 'BRL', availableCurrencyCodes = 'BRL', defaultTaxZoneId = ?, defaultShippingZoneId = ? WHERE code = '__default_channel__'").run(zoneIdForBrazil, zoneIdForBrazil);
            try {
                const hasTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'product_variant_price'").get();
                if (hasTable) {
                    const cols = db.prepare('PRAGMA table_info(product_variant_price)').all().map(c => String(c === null || c === void 0 ? void 0 : c.name));
                    const currencyCol = cols.includes('currencyCode') ? 'currencyCode' : (cols.includes('currencycode') ? 'currencycode' : null);
                    const channelCol = cols.includes('channelId') ? 'channelId' : (cols.includes('channelid') ? 'channelid' : null);
                    if (currencyCol && channelCol) {
                        const res = db.prepare(`UPDATE product_variant_price SET ${currencyCol} = 'BRL' WHERE ${channelCol} = ? AND ${currencyCol} != 'BRL'`).run(defaultChannel.id);
                        updatedVariantPrices = Number((_a = res === null || res === void 0 ? void 0 : res.changes) !== null && _a !== void 0 ? _a : 0);
                    }
                }
            }
            catch { }
            db.prepare("UPDATE region SET enabled = 0 WHERE type = 'country'").run();
            db.prepare("UPDATE region SET enabled = 1 WHERE type = 'country' AND code = 'BR'").run();
            db.prepare("UPDATE region SET enabled = 0 WHERE type = 'province' AND parentId != (SELECT id FROM region WHERE type = 'country' AND code = 'BR')").run();
        })();
        process.stdout.write(`ProductVariant prices atualizados para BRL: ${updatedVariantPrices}\n`);
        const after = snapshot(db);
        process.stdout.write(`Snapshot (depois):\n${JSON.stringify(after, null, 2)}\n`);
    }
    finally {
        db.close();
    }
}
main();
