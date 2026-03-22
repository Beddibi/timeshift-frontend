import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DaySchedule {
  dayOfWeek: number;
  isActive: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface CompanySettings {
  _id?: string;
  weeklySchedule: DaySchedule[];
  latenessGracePeriodMinutes: number;
  isGeolocationMandatoryForMobilePunch?: boolean;
  allowedLocations?: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) { }

  getSettings(): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(this.apiUrl);
  }

  updateSettings(settings: Partial<CompanySettings>): Observable<CompanySettings> {
    return this.http.patch<CompanySettings>(this.apiUrl, settings);
  }
}
