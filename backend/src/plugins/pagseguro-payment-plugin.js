"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pagSeguroPaymentHandler = void 0;
exports.processPagSeguroWebhook = processPagSeguroWebhook;
const core_1 = require("@vendure/core");
const loggerCtx = 'PagSeguroPaymentPlugin';
exports.pagSeguroPaymentHandler = new core_1.PaymentMethodHandler({
    code: 'pagseguro-payment',
    description: [{
            languageCode: core_1.LanguageCode.pt_BR,
            value: 'Pagamento via PagSeguro'
        }],
    args: {
        token: {
            type: 'string',
            label: [{
                    languageCode: core_1.LanguageCode.pt_BR,
                    value: 'Token PagSeguro'
                }]
        },
        appKey: {
            type: 'string',
            label: [{
                    languageCode: core_1.LanguageCode.pt_BR,
                    value: 'App Key PagSeguro'
                }]
        },
        environment: {
            type: 'string',
            label: [{
                    languageCode: core_1.LanguageCode.pt_BR,
                    value: 'Ambiente (sandbox/production)'
                }],
            defaultValue: 'sandbox'
        },
        notificationUrl: {
            type: 'string',
            label: [{
                    languageCode: core_1.LanguageCode.pt_BR,
                    value: 'URL de Notificação'
                }]
        }
    },
    createPayment: async (ctx, order, amount, args, metadata) => {
        try {
            core_1.Logger.info(`Criando pagamento PagSeguro para pedido ${order.code}`, loggerCtx);
            // Aqui você implementaria a lógica para criar o pagamento no PagSeguro
            // Por enquanto, retornamos um resultado de sucesso simulado
            const transactionId = `PS_${Date.now()}_${order.id}`;
            return {
                amount,
                state: 'Authorized',
                transactionId,
                metadata: {
                    pagSeguroTransactionId: transactionId,
                    environment: args.environment,
                    createdAt: new Date().toISOString()
                }
            };
        }
        catch (error) {
            core_1.Logger.error(`Erro ao criar pagamento PagSeguro: ${error.message}`, loggerCtx);
            return {
                amount,
                state: 'Declined',
                transactionId: '',
                metadata: { error: error.message }
            };
        }
    },
    settlePayment: async (ctx, order, payment, args) => {
        try {
            core_1.Logger.info(`Liquidando pagamento PagSeguro ${payment.transactionId}`, loggerCtx);
            // Aqui você implementaria a lógica para confirmar o pagamento no PagSeguro
            // Por enquanto, retornamos um resultado de sucesso
            return {
                success: true,
                metadata: {
                    settledAt: new Date().toISOString(),
                    pagSeguroStatus: 'PAID'
                }
            };
        }
        catch (error) {
            core_1.Logger.error(`Erro ao liquidar pagamento PagSeguro: ${error.message}`, loggerCtx);
            return {
                success: true,
                metadata: { error: error.message }
            };
        }
    }
});
// Função para processar webhooks do PagSeguro
async function processPagSeguroWebhook(req, res, connection) {
    var _a;
    try {
        core_1.Logger.info('Webhook PagSeguro recebido', loggerCtx);
        const notification = req.body;
        core_1.Logger.info(`Dados da notificação: ${JSON.stringify(notification)}`, loggerCtx);
        // Processar a notificação
        if (notification.event_type && ((_a = notification.data) === null || _a === void 0 ? void 0 : _a.id)) {
            await processNotification(notification, connection);
        }
        res.status(200).json({ status: 'received' });
    }
    catch (error) {
        core_1.Logger.error(`Erro ao processar webhook PagSeguro: ${error.message}`, loggerCtx);
        res.status(500).json({ error: 'Internal server error' });
    }
}
// Função para processar notificações específicas
async function processNotification(notification, connection) {
    try {
        const { event_type, data, reference_id } = notification;
        core_1.Logger.info(`Processando notificação PagSeguro: ${event_type} para referência ${reference_id}`, loggerCtx);
        // Buscar o pagamento pelo transactionId ou reference_id
        const payment = await connection.getRepository(core_1.Payment).findOne({
            where: [
                { transactionId: data.id },
                { transactionId: reference_id }
            ],
            relations: ['order']
        });
        if (!payment) {
            core_1.Logger.warn(`Pagamento não encontrado para transactionId: ${data.id} ou referenceId: ${reference_id}`, loggerCtx);
            return;
        }
        // Mapear eventos do PagSeguro para estados do Vendure
        let newState;
        switch (event_type) {
            case 'PAYMENT.AUTHORIZED':
                newState = 'Authorized';
                break;
            case 'PAYMENT.PAID':
                newState = 'Settled';
                break;
            case 'PAYMENT.DECLINED':
            case 'PAYMENT.CANCELLED':
                newState = 'Declined';
                break;
            case 'PAYMENT.REFUNDED':
                newState = 'Cancelled';
                break;
            default:
                core_1.Logger.warn(`Evento não reconhecido: ${event_type}`, loggerCtx);
                return;
        }
        // Atualizar o pagamento
        payment.state = newState;
        payment.metadata = {
            ...payment.metadata,
            pagSeguroNotification: notification,
            updatedAt: new Date().toISOString()
        };
        await connection.getRepository(core_1.Payment).save(payment);
        core_1.Logger.info(`Pagamento ${payment.id} atualizado para status ${newState}`, loggerCtx);
    }
    catch (error) {
        core_1.Logger.error(`Erro ao processar notificação: ${error.message}`, loggerCtx);
        throw error;
    }
}
