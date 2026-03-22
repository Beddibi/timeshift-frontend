import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Users, UserCheck, UserMinus, Clock, TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-angular';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  totalPersonnel: number;
  totalPresent: number;
  totalAbsent: number;
  lateCount: number;
  lateList: { name: string; scheduledTime: string; actualTime: string; delayMinutes: number }[];
  totalWorkedHours: number;
  recentActivity: { name: string; type: string; time: string; method: string }[];
  date: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, RouterModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly usersIcon = Users;
  readonly presentIcon = UserCheck;
  readonly absentIcon = UserMinus;
  readonly clockIcon = Clock;
  readonly trendIcon = TrendingUp;
  readonly activityIcon = Activity;
  readonly arrowUpIcon = ArrowUpRight;
  readonly arrowDownIcon = ArrowDownRight;

  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;
    this.http.get<DashboardStats>(`${environment.apiUrl}/attendance/stats/today`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de charger les statistiques';
        this.loading = false;
        console.error(err);
      }
    });
  }

  get presenceRate(): number {
    if (!this.stats || this.stats.totalPersonnel === 0) return 0;
    return Math.round((this.stats.totalPresent / this.stats.totalPersonnel) * 100);
  }
}
