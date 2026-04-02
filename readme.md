# Angular + Spring Boot with Microsoft Login (MSAL / Microsoft Entra ID)

## Overview

This repository contains:

- **Angular-client**: Angular application using **MSAL Angular** for Microsoft sign-in
- **springbootapi**: Spring Boot API protected by **Microsoft Entra ID** access tokens

The solution uses **two app registrations** in Microsoft Entra ID:

1. **Frontend SPA app registration** – used by the Angular client for sign-in and token acquisition
2. **Backend API app registration** – used to expose an API scope that the Angular client requests and sends to Spring Boot as a bearer token

---

## Architecture

1. User opens the Angular application
2. Upon clicking the login with microsoft, Angular redirects the user to Microsoft sign-in by using MSAL
3. After successful sign-in, Angular acquires an **ID token** and an **access token**
4. The access token is requested for the **Spring Boot API scope**
5. Angular sends the bearer token in API requests
6. Spring Boot validates the JWT token issued by Microsoft Entra ID and authorizes the request

---

## Prerequisites

- Azure subscription or access to a Microsoft Entra ID tenant
- Permission to create app registrations in Microsoft Entra ID
- Node.js and npm
- Angular CLI
- Java 21+
- Maven or Gradle

---

## Step 1: Create the backend API app registration in Microsoft Entra ID

Create the API registration first so you can reference its scope from the Angular app.

### 1.1 Register the API application

In the Microsoft Entra admin center:

- Go to **Identity** > **Applications** > **App registrations** > **New registration**
- Name: `user-api`
- Supported account types: choose the option used by your organization
- Redirect URI: leave blank for an API-only registration
- Click **Register**

Save these values from **Overview**:

- **Application (client) ID** → `<API_CLIENT_ID>`
- **Directory (tenant) ID** → `<TENANT_ID>`

### 1.2 Expose the API

Open the API app registration and go to **Expose an API**.

- Click **Set** next to **Application ID URI**
- Suggested value is usually:
  - `api://<API_CLIENT_ID>`

Create a scope:

- Click **Add a scope**
- Scope name: `access_as_user`
- Who can consent: `Admins and users`
- Admin consent display name: `Access API as user`
- Admin consent description: `Allows the application to access the API on behalf of the signed-in user.`
- User consent display name: `Access API as user`
- User consent description: `Allows this app to call the API for you.`
- State: `Enabled`

After saving, your scope will be:

- `api://<API_CLIENT_ID>/access_as_user`

### 1.3 Optional: Add app roles

If you want role-based authorization later, add **App roles** such as `Admin` or `User` in the API registration.

---

## Step 2: Create the Angular SPA app registration

### 2.1 Register the Angular application

In the Microsoft Entra admin center:

- Go to **App registrations** > **New registration**
- Name: `user-ui`
- Supported account types: choose the option used by your organization
- Redirect URI:
  - Platform: **Single-page application (SPA)**
  - URI: `http://localhost:4200` (For local development)
- Click **Register**

Save these values from **Overview**:

- **Application (client) ID** → `<SPA_CLIENT_ID>`
- **Directory (tenant) ID** → `<TENANT_ID>`

### 2.2 Add SPA redirect URIs

Open **Authentication** for the SPA app and make sure these redirect URIs exist:

- `http://localhost:4200`

For cloud deployed environments, also add your real frontend URL, for example:

- `https://your-frontend-domain.com`

Recommended settings:

- Enable **ID tokens** if your flow requires it in your project setup
- Under **Single-page application**, keep the SPA platform enabled

### 2.3 Add API permission to the backend API

Open **API permissions** for the SPA app:

- Click **Add a permission**
- Select **My APIs**
- Choose `user-api`
- Select delegated permission:
  - `access_as_user`
- Click **Add permissions**

If required in your tenant, grant **admin consent**.

### 2.4 Optional: Add Microsoft Graph permissions

If the Angular app reads user profile information, add:

- `openid`
- `profile`
- `email`
- `offline_access`
- `User.Read`

---

## Step 3: Angular project changes

Install packages:

```bash
npm install @azure/msal-browser @azure/msal-angular
```

### 3.1 Add environment settings

Create or update `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  redirectUri: 'http://localhost:4200',
  azureAPIApplicationIdUri: 'api://<API_CLIENT_ID>/access_as_user',
  azureSPAClientId: '<SPA_CLIENT_ID>',
  azureADAuthority: 'https://login.microsoftonline.com/<TENANT_ID>'
};
```

### 3.2 Configure MSAL

Check the app.config.ts


### 3.3 Passing Access token to API calls

Example `auth.interceptor.ts`:

```ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private msalService: MsalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return from(this.getAccessToken()).pipe(
      switchMap(token => {

        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });

        return next.handle(authReq);
      })
    );
  }

  private async getAccessToken(): Promise<string> {
    const account = this.msalService.instance.getActiveAccount()
      || this.msalService.instance.getAllAccounts()[0];

    const result = await this.msalService.instance.acquireTokenSilent({
      account,
      scopes: [environment.azureAPIApplicationIdUri]
    });

    return result.accessToken;
  }
}
```

---

## Step 4: Spring Boot project changes

Your Spring Boot API should validate JWT access tokens from Microsoft Entra ID.

### 4.1 Maven dependencies

Add the resource server dependencies.

#### Maven

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
</dependencies>
```

#### Gradle

```gradle
implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
implementation 'org.springframework.boot:spring-boot-starter-security'
```

### 4.2 Configure application properties

`src/main/resources/application.yml`

```yaml
server:
  port: 8080

logging:
  level:
    org.springframework.security: DEBUG
    
app:
  cors:
    allowed-origin: ${FRONTEND_ORIGIN:http://localhost:4200}
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://sts.windows.net/<TENANT_ID>/
          audience: api://<API_CLIENT_ID>
          jwkSetUri: https://login.microsoftonline.com/<TENANT_ID>/discovery/v2.0/keys
```

If your tenant or policy requires a different issuer format, use the issuer published by the OpenID configuration endpoint for your tenant.

### 4.3 Configure Spring Security

Since Azure Entra ID was using V1 token and the issuer information was throwing 401 error, the below metioned jwtDecoder method was added to resolve.
```code
Angular (v2) → requests token
↓
Entra issues v1 access token (sts.windows.net)
↓
Spring expects v2 issuer
↓
❌ iss mismatch → 401
```

```java
@Configuration
public class SecurityConfig {

    @Bean
    public JwtDecoder jwtDecoder() {

        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri(jwkSetUri)
                .build();

        OAuth2TokenValidator<Jwt> issuerValidator = new JwtClaimValidator<String>(
                "iss",
                iss -> iss.equals(issuerUri));

        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
                "aud",
                aud -> aud.contains(aud));

        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(issuerValidator, audienceValidator);

        decoder.setJwtValidator(validator);

        return decoder;
    }
}
```

### 4.4 Optional: Validate audience

For stronger validation, ensure the token audience matches your API application.

Typical audience values:

- `api://<API_CLIENT_ID>`
- or sometimes the raw API client ID, depending on token configuration

Implement a custom JWT validator if your project needs strict audience checks.

### 4.5 Optional: Role or scope-based authorization

If using scopes:

```java
.requestMatchers("/api/**").hasAuthority("SCOPE_access_as_user")
```

If using app roles or group claims, map them to authorities in Spring Security.

---

## Step 5: Enable CORS in Spring Boot

Because Angular and Spring Boot run on different origins locally, allow the frontend origin - check the method corsConfigurationSource


---

## Step 6: Local run instructions

### Start Spring Boot

```bash
./mvnw spring-boot:run
```

or

```bash
mvn spring-boot:run
```

### Start Angular

```bash
npm install
ng serve
```

Open:

- Angular-client: `http://localhost:4200`
- springbootapi: `http://localhost:8080`

---

## Step 7: Test the login flow

1. Open the Angular application
2. Click **Login with Microsoft**
3. Sign in with a user from the configured tenant
4. Angular receives tokens from Microsoft Entra ID
5. Angular calls the backend with the bearer token
6. Spring Boot validates the token and returns protected data

---

## Expected configuration values

Replace placeholders in the project with real values:

- `<TENANT_ID>`
- `<SPA_CLIENT_ID>`
- `<API_CLIENT_ID>`
- frontend URL
- backend URL

---

## Recommended project configuration files

### Angular

- `src/environments/environment.ts`
- `app.config.ts`
- `app.ts`
- login/logout UI component

### Spring Boot

- `pom.xml` or `build.gradle`
- `application.yml`
- `SecurityConfig.java`
- `CorsConfig.java`

---

## Troubleshooting

### AADSTS50011 / redirect URI mismatch

The redirect URI configured in Angular must exactly match the SPA app registration redirect URI.

### Login succeeds but API returns 401

Check:

- Angular is requesting the API scope: `api://<API_CLIENT_ID>/access_as_user`
- The SPA app has permission to the API app
- The access token audience matches the backend API
- Spring Boot issuer URI uses the correct tenant

### CORS errors

Make sure Spring Boot allows `http://localhost:4200` and the required headers.

### Consent errors

Grant admin consent if your tenant requires it.

---

## Security notes

- Do not hardcode secrets in the Angular SPA
- SPA apps normally use public client flows and do not keep a client secret
- Protect the Spring Boot API by validating issuer, audience, scopes, and roles as needed
- Use HTTPS in non-local environments

---

## Useful links

- Microsoft Entra app registrations
- MSAL Angular documentation
- Spring Security resource server documentation
- Microsoft identity platform scopes and permissions guidance

---

## License

Add your project license here.

