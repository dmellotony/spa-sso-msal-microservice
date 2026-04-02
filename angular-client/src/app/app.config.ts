import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';

import { routes } from './app.routes';
import { MsalModule } from '@azure/msal-angular';
/** MSAL imports */
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalInterceptor
} from '@azure/msal-angular';

import {
  PublicClientApplication,
  InteractionType
} from '@azure/msal-browser';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { environment } from '../environments/environment';
import { AuthInterceptor } from './auth/auth.interceptor';

/** MSAL CONFIG */
export function MSALInstanceFactory() {
  return new PublicClientApplication({
    auth: {
    clientId: environment.azureSPAClientId, //SPA_CLIENT_ID
    authority: environment.azureADAuthority, // e.g. https://login.microsoftonline.com/your-tenant-id
    redirectUri: environment.redirectUri
    },
    cache: {
      cacheLocation: 'localStorage'
    }
  });
}

/** INTERCEPTOR CONFIG */
export function MSALInterceptorConfigFactory() {
  const protectedResourceMap = new Map<string, Array<string>>();

  protectedResourceMap.set(
    environment.apiUrl, // change to your API base URL
    [environment.azureAPIApplicationIdUri]
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

/** FINAL CONFIG */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    /** IMPORTANT: use DI-based interceptors */
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(MsalModule),
    /** MSAL setup */
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },

    MsalService,

    /** Attach interceptor */
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  }
  ]
};