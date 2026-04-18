import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { FactoryProvider, Optional, PLATFORM_ID } from '@angular/core';
import { ApolloClientOptions, ApolloLink, InMemoryCache } from '@apollo/client/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink, Options } from 'apollo-angular/http';

import { environment } from '../../environments/environment';
import possibleTypesResult from '../common/introspection-results';

// const STATE_KEY = makeStateKey<any>('apollo.state'); // Removed for Angular 18 compatibility
let apolloCache: InMemoryCache;

export const APOLLO_CLIENT_PROVIDER: FactoryProvider = {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
    deps: [HttpLink, PLATFORM_ID],
};

function mergeFields(existing: any, incoming: any) {
    return {...existing, ...incoming};
}

function relaceFields(existing: any, incoming: any) {
    return incoming;
}

// Trying to debug why sessions won't work in Safari 13.1
// but only on the live prod version.
function logInterceptorData(on: boolean) {
    localStorage.setItem('_logInterceptorData', on ? 'true' : 'false');
}

if (typeof window !== 'undefined') {
    (window as any).logInterceptorData = logInterceptorData;
}

export function apolloOptionsFactory(
    httpLink: HttpLink,
    platformId: object,
): ApolloClientOptions<any> {
    const AUTH_TOKEN_KEY = 'auth_token';
    apolloCache = new InMemoryCache({
        possibleTypes: possibleTypesResult.possibleTypes,
        typePolicies: {
            Query: {
                fields: {
                    eligibleShippingMethods: {
                        merge: relaceFields,
                    },
                },
            },
            Product: {
                fields: {
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
            Collection: {
                fields: {
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
            Order: {
                fields: {
                    lines: {
                        merge: relaceFields,
                    },
                    shippingLines: {
                        merge: relaceFields,
                    },
                    discounts: {
                        merge: relaceFields,
                    },
                    shippingAddress: {
                        merge: relaceFields,
                    },
                    billingAddress: {
                        merge: relaceFields,
                    },
                },
            },
            Customer: {
                fields: {
                    addresses: {
                        merge: relaceFields,
                    },
                    customFields: {
                        merge: mergeFields,
                    },
                },
            },
        },
    });

    const { apiHost, apiPort, shopApiPath } = environment;
    const normalizedHost = apiHost.replace(/\/+$/, '');
    const normalizedPath = shopApiPath.replace(/^\/+/, '');
    const normalizedPort = `${apiPort ?? ''}`;
    const portSegment =
        normalizedPort === '' || normalizedPort === 'auto'
            ? ''
            : `:${normalizedPort}`;
    const uri = `${normalizedHost}${portSegment}/${normalizedPath}`;
    const options: Options = {
        uri,
        withCredentials: false,
    };

    const http = httpLink.create(options);
    const afterware = new ApolloLink((operation, forward) => {
        return forward(operation).map((response) => {
            const context = operation.getContext();
            const authHeader = context.response.headers.get('vendure-auth-token');
            if (authHeader && isPlatformBrowser(platformId)) {
                // If the auth token has been returned by the Vendure
                // server, we store it in localStorage
                localStorage.setItem(AUTH_TOKEN_KEY, authHeader);
            }
            return response;
        });
    });
    const middleware = new ApolloLink((operation, forward) => {
        if (isPlatformBrowser(platformId)) {
            operation.setContext({
                headers: new HttpHeaders().set(
                    'Authorization',
                    `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY) || null}`,
                ),
            });
        }
        return forward(operation);
    });

    // Simplified for Angular 18 - removed SSR transfer state logic
    const isBrowser = isPlatformBrowser(platformId);
    
    if (!isBrowser) {
        // Reset apolloCache for server-side rendering
        apolloCache.reset();
    }

    return {
        cache: apolloCache,
        ssrMode: true,
        ssrForceFetchDelay: 500,
        link: ApolloLink.from([middleware, afterware, http]),
    };
}
