import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  _id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl);
  }

  createUser(user: any): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.apiUrl, user);
  }

  updateUser(id: string, user: any): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
