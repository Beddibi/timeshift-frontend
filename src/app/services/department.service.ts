import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Department {
  _id?: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/department`;

  constructor(private http: HttpClient) { }

  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  createDepartment(department: Department): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  deleteDepartment(id: string): Observable<Department> {
    return this.http.delete<Department>(`${this.apiUrl}/${id}`);
  }

  updateDepartment(id: string, department: Partial<Department>): Observable<Department> {
    return this.http.patch<Department>(`${this.apiUrl}/${id}`, department);
  }
}
