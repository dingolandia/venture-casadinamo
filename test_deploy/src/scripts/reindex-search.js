"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@vendure/core");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const vendure_config_1 = require("../vendure-config");
const loggerCtx = 'ReindexSearchScript';
const SearchIndexService = require('@vendure/core/dist/plugin/default-search-plugin/indexer/search-index.service')
    .SearchIndexService;
async function main() {
    const { app } = await (0, core_1.bootstrapWorker)(vendure_config_1.config);
    const requestContextService = app.get(core_1.RequestContextService);
    const searchIndexService = app.get(SearchIndexService);
    const ctx = await requestContextService.create({
        apiType: 'admin',
        languageCode: 'pt_BR',
    });
    const job = await searchIndexService.reindex(ctx);
    core_1.Logger.info(`Reindex iniciado. JobId=${job.id}`, loggerCtx);
    const final = await (0, rxjs_1.lastValueFrom)(job
        .updates({ pollInterval: 500, timeoutMs: 30 * 60 * 1000, errorOnFail: false })
        .pipe((0, operators_1.filter)((u) => u.state === 'COMPLETED' || u.state === 'FAILED'), (0, operators_1.take)(1)));
    if (final.state === 'FAILED') {
        throw new Error(final.error || 'Reindex falhou');
    }
    core_1.Logger.info(`Reindex concluído. progress=${final.progress}`, loggerCtx);
    process.exit(0);
}
main().catch((e) => {
    core_1.Logger.error((e === null || e === void 0 ? void 0 : e.stack) || (e === null || e === void 0 ? void 0 : e.message) || String(e), loggerCtx);
    process.exit(1);
});
