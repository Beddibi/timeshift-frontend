import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Personnel } from '../models/personnel.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonnelService {
  private apiUrl = `${environment.apiUrl}/personnel`;

  constructor(private http: HttpClient) { }

  getPersonnel(): Observable<Personnel[]> {
    return this.http.get<Personnel[]>(this.apiUrl);
  }

  getPersonnelById(id: string): Observable<Personnel> {
    return this.http.get<Personnel>(`${this.apiUrl}/${id}`);
  }

  createPersonnel(personnel: Personnel): Observable<Personnel> {
    return this.http.post<Personnel>(this.apiUrl, personnel);
  }

  updatePersonnel(id: string, personnel: Partial<Personnel>): Observable<Personnel> {
    return this.http.patch<Personnel>(`${this.apiUrl}/${id}`, personnel);
  }

  deletePersonnel(id: string): Observable<Personnel> {
    return this.http.delete<Personnel>(`${this.apiUrl}/${id}`);
  }
}
