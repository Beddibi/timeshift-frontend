import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, X, Clock, User, CheckCircle, AlertTriangle, XCircle, Plus } from 'lucide-angular';
import { Shift } from '../../../services/planning.service';
import { Personnel } from '../../../models/personnel.model';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, LucideAngularModule],
  templateUrl: './day-detail.component.html',
  styleUrl: './day-detail.component.scss'
})
export class DayDetailComponent implements OnChanges {
  @Input() date!: Date;
  @Input() personnelList: Personnel[] = [];
  @Input() shifts: Shift[] = [];
  @Input() attendances: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() editAttendance = new EventEmitter<any>();
  @Output() addAttendance = new EventEmitter<{personnelId?: string}>();

  readonly xIcon = X;
  readonly clockIcon = Clock;
  readonly userIcon = User;
  readonly presentIcon = CheckCircle;
  readonly alertIcon = AlertTriangle;
  readonly absentIcon = XCircle;
  readonly plusIcon = Plus;

  daySummary: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] || changes['shifts'] || changes['attendances']) {
      this.buildDaySummary();
    }
  }

  buildDaySummary(): void {
    if (!this.date || !this.personnelList) return;
    const dateStr = this.date.toISOString().split('T')[0];
    
    this.daySummary = this.personnelList.map(person => {
      const pId = person._id;
      // Get shifts for this person on this day
      const personShifts = this.shifts.filter(s => {
        const sId = typeof s.personnelId === 'object' ? (s.personnelId as any)._id : s.personnelId;
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sId === pId && sDate === dateStr;
      });

      // Get attendances for this person on this day
      const personAttendances = this.attendances.filter(a => {
        const aId = typeof a.employeeId === 'object' ? (a.employeeId as any)._id : a.employeeId;
        const aDate = new Date(a.punchTime).toISOString().split('T')[0];
        return aId === pId && aDate === dateStr;
      });

      let status = 'AUCUN_PLANNING';
      if (personShifts.length > 0) {
        if (personAttendances.length >= 2) status = 'PRESENT';
        else if (personAttendances.length === 1) status = 'INCOMPLET';
        else status = 'ABSENT';
      } else if (personAttendances.length > 0) {
        status = 'NON_PLANIFIE';
      }

      return {
        person,
        shifts: personShifts,
        attendances: personAttendances,
        status
      };
    });

    // Sort by status, absent first
    this.daySummary.sort((a, b) => {
      const rank = { 'ABSENT': 1, 'INCOMPLET': 2, 'PRESENT': 3, 'NON_PLANIFIE': 4, 'AUCUN_PLANNING': 5 };
      return (rank[a.status as keyof typeof rank] || 99) - (rank[b.status as keyof typeof rank] || 99);
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
