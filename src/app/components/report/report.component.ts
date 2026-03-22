import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Calendar, Users, Clock, AlertTriangle, TrendingUp, Download } from 'lucide-angular';
import { PlanningService, Shift } from '../../services/planning.service';
import { PersonnelService } from '../../services/personnel.service';
import { Personnel } from '../../models/personnel.model';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss'
})
export class ReportComponent implements OnInit {
  readonly calendarIcon = Calendar;
  readonly usersIcon = Users;
  readonly clockIcon = Clock;
  readonly alertIcon = AlertTriangle;
  readonly trendIcon = TrendingUp;
  readonly downloadIcon = Download;

  personnelList: Personnel[] = [];
  shifts: Shift[] = [];
  
  currentMonth: Date = new Date();
  
  // KPIs
  totalShifts: number = 0;
  totalHours: number = 0;
  totalAbsences: number = 0;
  totalOvertimeHours: number = 0;

  // Department Stats
  departmentStats: { dept: string, count: number }[] = [];

  constructor(
    private planningService: PlanningService,
    private personnelService: PersonnelService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // 1. Fetch Personnel
    this.personnelService.getPersonnel().subscribe(data => {
      this.personnelList = data;
      this.calculateDepartmentStats();
    });

    // 2. Fetch shifts for the current month
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDateStr = firstDay.toISOString().split('T')[0];
    const endDateStr = lastDay.toISOString().split('T')[0];

    this.planningService.getShifts(startDateStr, endDateStr).subscribe(data => {
      this.shifts = data;
      this.calculateKPIs();
    });
  }

  calculateKPIs(): void {
    this.totalShifts = this.shifts.length;
    this.totalHours = 0;
    this.totalAbsences = 0;
    this.totalOvertimeHours = 0;

    this.shifts.forEach(shift => {
      if (shift.type === 'ABSENT' || shift.type === 'SICK') {
        this.totalAbsences++;
      } else {
        // Calculate duration
        const start = this.timeToDate(shift.startTime);
        const end = this.timeToDate(shift.endTime);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 0) {
          this.totalHours += diffHours;
          if (shift.type === 'OVERTIME') {
            this.totalOvertimeHours += diffHours;
          }
        }
      }
    });

    // rounding
    this.totalHours = Math.round(this.totalHours * 10) / 10;
    this.totalOvertimeHours = Math.round(this.totalOvertimeHours * 10) / 10;
  }

  calculateDepartmentStats(): void {
    const counts: { [key: string]: number } = {};
    let hasDepartments = false;

    this.personnelList.forEach(p => {
      const deptName = typeof p.department === 'string' ? p.department : 
                       (p.department as any)?.name || 'Non assigné';
      counts[deptName] = (counts[deptName] || 0) + 1;
      if (deptName !== 'Non assigné') hasDepartments = true;
    });

    this.departmentStats = Object.keys(counts).map(key => ({
      dept: key,
      count: counts[key]
    })).sort((a, b) => b.count - a.count);
  }

  private timeToDate(timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadData();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadData();
  }
}
