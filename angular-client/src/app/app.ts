import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { UserService } from './user/user.service';
import { UserDetails } from './interfaces/user-details';
import { Observable } from 'rxjs';

/** MSAL */
import { MsalService } from '@azure/msal-angular';
import { environment } from '../environments/environment.prod';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('angular-client');

  userData$!: Observable<UserDetails>;
  userId: number | null = null;
  user: UserDetails | null = null;
  error = '';
  loading = false;

  constructor(
    private userService: UserService,
    private msalService: MsalService
  ) {}

ngOnInit(): void {
  this.msalService.handleRedirectObservable().subscribe({
    next: (result) => {
      if (result && result.account) {
        this.msalService.instance.setActiveAccount(result.account);
      }

      this.tryLoadUser(); // only once after redirect handling
    },
    error: () => {
      this.tryLoadUser(); // fallback
    }
  });
}

setActiveAccount(): void {
  let activeAccount = this.msalService.instance.getActiveAccount();

  if (!activeAccount) {
    const accounts = this.msalService.instance.getAllAccounts();

    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
    }
  }
}
tryLoadUser(): void {
  this.setActiveAccount();
  const account = this.msalService.instance.getActiveAccount();

  if (account) {
    this.loadUser();   // 
  }
}
  isLoggedIn(): boolean {
    return this.msalService.instance.getAllAccounts().length > 0;
  }

  /** LOGIN */
  login() {
    this.msalService.loginRedirect({
      scopes: [
        'openid',
        'profile',
        environment.azureAPIApplicationIdUri
      ],
      prompt: 'select_account'
    });
  }

  /** LOGOUT */
logout() {
  this.user = null;
  this.loading = false;

  this.msalService.logoutRedirect({
    postLogoutRedirectUri: environment.redirectUri,
    account: this.msalService.instance.getActiveAccount()
  });
}

  /** EXISTING API CALL */
  loadUser(): void {
    this.error = '';

    this.loading = true;

    this.userService.getUserDetails().subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to fetch user.';
        this.loading = false;
      }
    });
  }
}