import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserDetails } from '../interfaces/user-details';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getUserDetails(): Observable<UserDetails> {
    // The URL will be proxied to http://localhost:80801/users
    return this.http.get<UserDetails>(`${this.apiBaseUrl}/users`);
  }
}
