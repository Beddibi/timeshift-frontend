import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClockInDto, Attendance } from '../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  clockIn(data: ClockInDto): Observable<{ message: string, attendance: Attendance, employee: any }> {
    return this.http.post<{ message: string, attendance: Attendance, employee: any }>(`${this.apiUrl}/clock`, data);
  }

  getTodaysAttendance(): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/today`);
  }

  mobilePunch(data: { latitude?: number, longitude?: number, accuracy?: number, deviceInfo?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mobile-punch`, data);
  }
}
