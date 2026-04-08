import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { CartFragment } from '../../../common/generated-types';

@Component({
  selector: 'vsf-cart-totals',
  templateUrl: './cart-totals.component.html',
  styleUrls: ['./cart-totals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartTotalsComponent {
    @Input() cart: CartFragment;

    formatShippingName(method: any): string {
        if (method && method.metadata && method.metadata.melhorEnvio) {
            const me = method.metadata.melhorEnvio;
            return `${me.carrierName} - ${me.serviceName}`;
        }
        return method && method.name ? method.name.replace('Melhor Envio - ', '') : '';
    }
}
  constructor() { }

  ngOnInit(): void {
  }

}
