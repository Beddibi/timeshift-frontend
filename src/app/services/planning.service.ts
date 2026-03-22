import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Shift {
  _id?: string;
  personnelId: string | any; // Any allows for populated objects
  date: string;
  startTime: string;
  endTime: string;
  type: 'NORMAL' | 'OVERTIME' | 'LEAVE' | 'SICK' | 'ABSENT' | 'HOLIDAY';
  period?: 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
  notes?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private apiUrl = `${environment.apiUrl}/planning`;

  constructor(private http: HttpClient) { }

  getShifts(startDate?: string, endDate?: string): Observable<Shift[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    
    return this.http.get<Shift[]>(this.apiUrl, { params });
  }

  getAttendances(startDate: string, endDate: string): Observable<any[]> {
    let params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<any[]>(`${environment.apiUrl}/attendance/range`, { params });
  }

  createManualAttendance(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/attendance/manual`, data);
  }

  updateAttendance(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/attendance/${id}`, data);
  }

  deleteAttendance(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/attendance/${id}`);
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.http.post<Shift>(this.apiUrl, shift);
  }

  createBulk(shifts: Partial<Shift>[]): Observable<Shift[]> {
    return this.http.post<Shift[]>(`${this.apiUrl}/bulk`, shifts);
  }

  updateShift(id: string, shift: Partial<Shift>): Observable<Shift> {
    return this.http.patch<Shift>(`${this.apiUrl}/${id}`, shift);
  }

  deleteShift(id: string): Observable<Shift> {
    return this.http.delete<Shift>(`${this.apiUrl}/${id}`);
  }

  // ===== TEMPLATES =====

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates/list`);
  }

  createTemplate(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/templates`, data);
  }

  deleteTemplate(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/templates/${id}`);
  }

  applyTemplate(data: { templateId: string; personnelIds: string[]; startDate: string; weeks?: number }): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(`${this.apiUrl}/templates/apply`, data);
  }
}
