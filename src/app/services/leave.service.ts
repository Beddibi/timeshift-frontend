import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Leave {
  _id?: string;
  employeeId: string | any;
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  rejectionNote?: string;
  approvedAt?: string;
  createdAt?: string;
}

export interface LeaveBalance {
  year: number;
  employeeId: string;
  annualAllowance: number;
  totalUsed: number;
  remaining: number;
  breakdown: Record<string, number>;
  pendingRequests: number;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private apiUrl = `${environment.apiUrl}/leaves`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { employeeId?: string; status?: string; year?: number }): Observable<Leave[]> {
    let params = new HttpParams();
    if (filters?.employeeId) params = params.set('employeeId', filters.employeeId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.year) params = params.set('year', filters.year.toString());
    return this.http.get<Leave[]>(this.apiUrl, { params });
  }

  getOne(id: string): Observable<Leave> {
    return this.http.get<Leave>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Leave>): Observable<Leave> {
    return this.http.post<Leave>(this.apiUrl, data);
  }

  updateStatus(id: string, status: string, rejectionNote?: string): Observable<Leave> {
    return this.http.patch<Leave>(`${this.apiUrl}/${id}/status`, { status, rejectionNote });
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getBalance(employeeId: string, year?: number): Observable<LeaveBalance> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<LeaveBalance>(`${this.apiUrl}/balance/${employeeId}`, { params });
  }
}
