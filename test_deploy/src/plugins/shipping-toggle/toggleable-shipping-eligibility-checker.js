"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleableShippingEligibilityChecker = void 0;
const core_1 = require("@vendure/core");
exports.toggleableShippingEligibilityChecker = new core_1.ShippingEligibilityChecker({
    code: 'toggleable-shipping-eligibility-checker',
    description: [
        { languageCode: core_1.LanguageCode.en, value: 'Shipping eligibility with on/off toggle' },
        { languageCode: core_1.LanguageCode.pt_BR, value: 'Elegibilidade de frete com liga/desliga' },
    ],
    args: {
        orderMinimum: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: [
                { languageCode: core_1.LanguageCode.en, value: 'Minimum order value' },
                { languageCode: core_1.LanguageCode.pt_BR, value: 'Valor mínimo do pedido' },
            ],
            description: [
                {
                    languageCode: core_1.LanguageCode.en,
                    value: 'Order is eligible only if its subtotalWithTax is greater or equal to this value',
                },
                {
                    languageCode: core_1.LanguageCode.pt_BR,
                    value: 'Pedido é elegível apenas se o subtotalWithTax for maior ou igual a este valor',
                },
            ],
        },
    },
    check: (ctx, order, args, method) => {
        var _a;
        const enabled = (_a = method === null || method === void 0 ? void 0 : method.customFields) === null || _a === void 0 ? void 0 : _a.storefrontEnabled;
        if (enabled === false) {
            return false;
        }
        return order.subTotalWithTax >= args.orderMinimum;
    },
});
