import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AddPaymentMutation, AddPaymentMutationVariables, GetEligiblePaymentMethodsQuery, GetCartTotalsQuery } from '../../../common/generated-types';
import { DataService } from '../../../core/providers/data/data.service';
import { StateService } from '../../../core/providers/state/state.service';
import { GET_CART_TOTALS } from '../../../core/components/cart-toggle/cart-toggle.graphql';

import { ADD_PAYMENT, GET_ELIGIBLE_PAYMENT_METHODS } from './checkout-payment.graphql';

@Component({
    selector: 'vsf-checkout-payment',
    templateUrl: './checkout-payment.component.html',
    // styleUrls: ['./checkout-payment.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPaymentComponent implements OnInit {
    cardNumber: string;
    expMonth: number;
    expYear: number;
    paymentMethods$: Observable<GetEligiblePaymentMethodsQuery['eligiblePaymentMethods']>;
    selectedPaymentMethodCode: string | undefined;
    paymentErrorMessage: string | undefined;

    paymentType: 'credit_card' | 'boleto' | 'pix' = 'pix';
    qrCodeUrl: string | null = null;
    orderTotal: number = 0;

    constructor(private dataService: DataService,
                private stateService: StateService,
                private router: Router,
                private route: ActivatedRoute,
                private changeDetector: ChangeDetectorRef) { }

    ngOnInit() {
        this.paymentMethods$ = this.dataService.query<GetEligiblePaymentMethodsQuery>(GET_ELIGIBLE_PAYMENT_METHODS)
            .pipe(map(res => {
                const methods = res.eligiblePaymentMethods;
                this.selectedPaymentMethodCode =
                    methods.find(method => method.code === 'pagseguro-payment')?.code ??
                    methods[0]?.code;
                this.changeDetector.markForCheck();
                return methods;
            }));

        this.dataService.query<GetCartTotalsQuery>(GET_CART_TOTALS).subscribe(res => {
            this.orderTotal = res.activeOrder?.totalWithTax || 0;
            this.changeDetector.markForCheck();
        });
    }

    getMonths(): number[] {
        return Array.from({ length: 12 }).map((_, i) => i + 1);
    }

    getYears(): number[] {
        const year = new Date().getFullYear();
        return Array.from({ length: 10 }).map((_, i) => year + i);
    }

    generatePix() {
        // Simulando a geração do QR Code via PagSeguro
        this.qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126360014br.gov.bcb.pix0114+5511Casadinamo5204000053039865802BR5913Casadinamo6009Sao%20Paulo62070503***6304D1B91A';
    }

    completeOrder(paymentMethodCode = this.selectedPaymentMethodCode) {
        if (!paymentMethodCode) {
            this.paymentErrorMessage = 'Nenhum metodo de pagamento disponivel.';
            this.changeDetector.markForCheck();
            return;
        }
        this.dataService.mutate<AddPaymentMutation, AddPaymentMutationVariables>(ADD_PAYMENT, {
            input: {
                method: paymentMethodCode,
                metadata: {
                    paymentType: this.paymentType
                },
            },
        })
            .subscribe(async ({ addPaymentToOrder }) => {
                switch (addPaymentToOrder?.__typename) {
                    case 'Order':
                        const order = addPaymentToOrder;
                        if (order && (order.state === 'PaymentSettled' || order.state === 'PaymentAuthorized')) {
                            await new Promise<void>(resolve => setTimeout(() => {
                                this.stateService.setState('activeOrderId', null);
                                resolve();
                            }, 500));
                            this.router.navigate(['../confirmation', order.code], { relativeTo: this.route });
                        }
                        break;
                    case 'OrderPaymentStateError':
                    case 'PaymentDeclinedError':
                    case 'PaymentFailedError':
                    case 'OrderStateTransitionError':
                        this.paymentErrorMessage = addPaymentToOrder.message;
                        break;
                }

            });
    }
}
