"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPackageFromOrder = buildPackageFromOrder;
/**
 * Estratégia simples de embalagem:
 * - Peso total = soma(weightKg * quantity)
 * - Dimensões do pacote = maior comprimento/largura/altura entre os itens
 *   (ajuste depois para sua regra de caixa/empacotamento real)
 */
function buildPackageFromOrder(order) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let totalWeightKg = 0;
    let maxL = 0, maxW = 0, maxH = 0;
    let declared = 0;
    const orderLines = [];
    for (const line of order.lines) {
        const v = line.productVariant;
        const qty = line.quantity;
        const w = Number(((_a = v.customFields) === null || _a === void 0 ? void 0 : _a.weightKg) || 0);
        const l = Number(((_b = v.customFields) === null || _b === void 0 ? void 0 : _b.lengthCm) || 0);
        const wd = Number(((_c = v.customFields) === null || _c === void 0 ? void 0 : _c.widthCm) || 0);
        const h = Number(((_d = v.customFields) === null || _d === void 0 ? void 0 : _d.heightCm) || 0);
        const dv = Number(((_e = v.customFields) === null || _e === void 0 ? void 0 : _e.declaredValue) || 0);
        totalWeightKg += w * qty;
        maxL = Math.max(maxL, l);
        maxW = Math.max(maxW, wd);
        maxH = Math.max(maxH, h);
        declared += dv * qty;
        orderLines.push({
            orderLineId: line === null || line === void 0 ? void 0 : line.id,
            quantity: qty,
            productVariantId: v === null || v === void 0 ? void 0 : v.id,
            sku: v === null || v === void 0 ? void 0 : v.sku,
            name: v === null || v === void 0 ? void 0 : v.name,
            customFields: {
                weightKg: (_f = v === null || v === void 0 ? void 0 : v.customFields) === null || _f === void 0 ? void 0 : _f.weightKg,
                lengthCm: (_g = v === null || v === void 0 ? void 0 : v.customFields) === null || _g === void 0 ? void 0 : _g.lengthCm,
                widthCm: (_h = v === null || v === void 0 ? void 0 : v.customFields) === null || _h === void 0 ? void 0 : _h.widthCm,
                heightCm: (_j = v === null || v === void 0 ? void 0 : v.customFields) === null || _j === void 0 ? void 0 : _j.heightCm,
                declaredValue: (_k = v === null || v === void 0 ? void 0 : v.customFields) === null || _k === void 0 ? void 0 : _k.declaredValue,
            },
        });
    }
    const usedDefaults = {
        weightKg: !(totalWeightKg > 0),
        lengthCm: !(maxL > 0),
        widthCm: !(maxW > 0),
        heightCm: !(maxH > 0),
    };
    const weightKg = usedDefaults.weightKg ? 0.3 : totalWeightKg;
    const lengthCm = usedDefaults.lengthCm ? 20 : maxL;
    const widthCm = usedDefaults.widthCm ? 15 : maxW;
    const heightCm = usedDefaults.heightCm ? 10 : maxH;
    return {
        weightKg: Number(weightKg.toFixed(3)),
        lengthCm: Number(lengthCm.toFixed(1)),
        widthCm: Number(widthCm.toFixed(1)),
        heightCm: Number(heightCm.toFixed(1)),
        insuranceValueBRL: Number(declared.toFixed(2)),
        orderLines,
        usedDefaults,
    };
}
