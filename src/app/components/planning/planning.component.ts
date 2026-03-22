import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, CalendarDays, Clock, FileText, Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit2, Calendar, Smartphone } from 'lucide-angular';
import { PlanningService, Shift } from '../../services/planning.service';
import { PersonnelService } from '../../services/personnel.service';
import { Personnel } from '../../models/personnel.model';
import { LeaveService, Leave } from '../../services/leave.service';
import { ShiftFormComponent } from './shift-form/shift-form.component';
import { DayDetailComponent } from './day-detail/day-detail.component';
import { ManualPointageFormComponent } from './manual-pointage-form/manual-pointage-form.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { SettingsService, CompanySettings } from '../../services/settings.service';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

// Helper to avoid timezone offset bugs (e.g., 00:00:00 GMT+1 becoming 23:00:00 GMT the previous day in ISO)
const toLocalYYYYMMDD = (d: Date | string): string => {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule, 
    MatButtonModule, 
    MatDialogModule,
    MatSidenavModule,
    ShiftFormComponent,
    DayDetailComponent,
    ManualPointageFormComponent,
    LucideAngularModule
  ],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.scss'
})
export class PlanningComponent implements OnInit {
  readonly clockIcon = Clock;
  readonly exportIcon = FileText;
  readonly plusIcon = Plus;
  readonly searchIcon = Search;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;
  readonly trashIcon = Trash2;
  readonly editIcon = Edit2;
  readonly calendarIcon = Calendar;
  readonly smartphoneIcon = Smartphone;

  personnelList: Personnel[] = [];
  shifts: Shift[] = [];
  attendances: any[] = [];
  approvedLeaves: Leave[] = [];
  weekDays: Date[] = [];
  searchTerm: string = '';
  currentWeekOffset: number = 0;
  viewMode: 'week' | 'month' | 'employee-month' = 'week';

  // Specific to Employee Month View
  selectedPersonnelMonth: Personnel | null = null;
  monthViewDate: Date = new Date();
  monthCalendarDays: any[] = [];
  monthKPIs: any = { workedDays: 0, totalHours: 0, absences: 0, lateArrivals: 0 };

  companySettings: CompanySettings | null = null;
  
  // Global HR Report
  isGeneratingGlobalPDF: boolean = false;
  globalMonthReportData: any[] = [];
  currentDate: Date = new Date();

  // Sidebar specific state
  sidebarMode: 'NONE' | 'SHIFT' | 'DAY_DETAIL' | 'MANUAL_POINTAGE' = 'NONE';
  get isSidebarOpen(): boolean { return this.sidebarMode !== 'NONE'; }
  
  editingShift: Shift | null = null;
  selectedPersonnelToMap: string = '';
  selectedDateToMap: Date = new Date();
  
  // For Day Detail & Manual Pointage
  selectedDayDetail: Date = new Date();
  editingAttendance: any = null;

  constructor(
    private planningService: PlanningService,
    private personnelService: PersonnelService,
    private settingsService: SettingsService,
    private leaveService: LeaveService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateCurrentWeek();
    this.loadData();
    this.settingsService.getSettings().subscribe(s => this.companySettings = s);
  }

  generateCurrentWeek(): void {
    const today = new Date();
    // Apply offset (7 days per unit)
    today.setDate(today.getDate() + (this.currentWeekOffset * 7));
    
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start on Monday
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + startOffset);
    
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        this.weekDays.push(d);
    }
  }

  loadData(): void {
    this.personnelService.getPersonnel().subscribe(p => {
      this.personnelList = p.filter(emp => emp.isActive === true);
    });
    
    const startDate = toLocalYYYYMMDD(this.weekDays[0]);
    const endDate = toLocalYYYYMMDD(this.weekDays[6]);
    
    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        shifts: this.planningService.getShifts(startDate, endDate),
        attendances: this.planningService.getAttendances(startDate, endDate),
        leaves: this.leaveService.getAll({ status: 'APPROVED' })
      }).subscribe(res => {
        this.attendances = res.attendances;
        this.approvedLeaves = res.leaves;
        
        // Convert real shifts
        let allShifts = [...res.shifts];

        // Generate virtual shifts for leaves overlapping this week
        const viewStart = new Date(startDate);
        const viewEnd = new Date(endDate);
        viewEnd.setHours(23, 59, 59, 999);

        this.approvedLeaves.forEach(leave => {
          const leaveStart = new Date(leave.startDate);
          leaveStart.setHours(0, 0, 0, 0);
          const leaveEnd = new Date(leave.endDate);
          leaveEnd.setHours(23, 59, 59, 999);

          // If leave overlaps with current week view
          if (leaveStart <= viewEnd && leaveEnd >= viewStart) {
            let current = new Date(Math.max(leaveStart.getTime(), viewStart.getTime()));
            const stopDate = new Date(Math.min(leaveEnd.getTime(), viewEnd.getTime()));
            
            while (current <= stopDate) {
              const dateStr = toLocalYYYYMMDD(current);
              const pId = typeof leave.employeeId === 'string' ? leave.employeeId : (leave.employeeId as any)._id;
              
              allShifts.push({
                _id: `VIRTUAL_LEAVE_${leave._id}_${dateStr}`,
                personnelId: pId,
                date: current.toISOString(),
                startTime: '08:00', // Display purely, not deeply functional
                endTime: '17:00',
                type: 'LEAVE',
                notes: `Auto: Congé Accordé`
              });
              current.setDate(current.getDate() + 1);
            }
          }
        });

        this.shifts = allShifts;
      });
    });
  }

  previousWeek(): void {
    this.currentWeekOffset--;
    this.generateCurrentWeek();
    this.loadData();
  }

  nextWeek(): void {
    this.currentWeekOffset++;
    this.generateCurrentWeek();
    this.loadData();
  }

  setViewMode(mode: 'week' | 'month' | 'employee-month'): void {
    this.viewMode = mode;
  }

  get filteredPersonnelList(): Personnel[] {
    if (!this.searchTerm) return this.personnelList;
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.personnelList.filter(p => 
      p.firstName.toLowerCase().includes(lowerTerm) || 
      p.lastName.toLowerCase().includes(lowerTerm) ||
      p.position.toLowerCase().includes(lowerTerm)
    );
  }

  getShiftsForPersonnelAndDay(personnelId: string, day: Date): Shift[] {
    const dateStr = toLocalYYYYMMDD(day);
    return this.shifts.filter(s => {
      const sId = typeof s.personnelId === 'object' ? s.personnelId._id : s.personnelId;
      const sDate = toLocalYYYYMMDD(s.date);
      return sId === personnelId && sDate === dateStr;
    });
  }

  getAttendancesForPersonnelAndDay(personnelId: string, day: Date): any[] {
    const dateStr = toLocalYYYYMMDD(day);
    return this.attendances.filter(a => {
      const aId = typeof a.employeeId === 'object' ? a.employeeId._id : a.employeeId;
      const aDate = toLocalYYYYMMDD(a.punchTime);
      return aId === personnelId && aDate === dateStr;
    });
  }

  openSidebar(personnelId?: string, date?: Date): void {
    const queryParams: any = {};
    if (personnelId) queryParams.personnelId = personnelId;
    if (date) queryParams.date = toLocalYYYYMMDD(date);
    this.router.navigate(['/planning/session/new'], { queryParams });
  }

  editShift(shift: Shift, event?: Event): void {
    if (event) event.stopPropagation();
    if (shift._id?.startsWith('VIRTUAL_LEAVE_')) {
      alert("Il s'agit d'un congé importé automatiquement depuis le module 'Congés'. Vous devez aller dans Gestion des Congés pour l'annuler ou le modifier.");
      return;
    }
    this.router.navigate(['/planning/session/edit', shift._id]);
  }

  openDayDetail(date: Date): void {
    this.selectedDayDetail = date;
    this.sidebarMode = 'DAY_DETAIL';
  }

  addManualPointage(event: { personnelId?: string }): void {
    this.editingAttendance = null;
    this.selectedPersonnelToMap = event.personnelId || '';
    this.sidebarMode = 'MANUAL_POINTAGE';
  }

  editManualPointage(attendance: any): void {
    this.editingAttendance = attendance;
    this.selectedPersonnelToMap = '';
    this.sidebarMode = 'MANUAL_POINTAGE';
  }

  closeSidebar(): void {
    this.sidebarMode = 'NONE';
    this.editingShift = null;
    this.editingAttendance = null;
  }

  onShiftSaved(shift: Shift): void {
    this.loadData();
    this.closeSidebar();
  }



  openMonthView(personnel: Personnel): void {
    this.selectedPersonnelMonth = personnel;
    this.monthViewDate = new Date();
    this.monthViewDate.setDate(1); // Start at 1st
    this.setViewMode('employee-month');
    this.loadEmployeeMonthData();
  }

  loadEmployeeMonthData(): void {
    if (!this.selectedPersonnelMonth) return;

    const year = this.monthViewDate.getFullYear();
    const month = this.monthViewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Calculate start date of the calendar grid (potentially previous month's days)
    const startDate = new Date(firstDay);
    const firstDayOfWeek = startDate.getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Start on Monday
    startDate.setDate(startDate.getDate() - startOffset);

    // Calculate end date of the calendar grid
    const endDate = new Date(lastDay);
    const lastDayOfWeek = endDate.getDay();
    const endOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    endDate.setDate(endDate.getDate() + endOffset);

    const startStr = toLocalYYYYMMDD(startDate);
    const endStr = toLocalYYYYMMDD(endDate);

    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        shifts: this.planningService.getShifts(startStr, endStr),
        attendances: this.planningService.getAttendances(startStr, endStr),
        leaves: this.leaveService.getAll({ employeeId: this.selectedPersonnelMonth!._id, status: 'APPROVED' })
      }).subscribe(res => {
        const dbShifts: Shift[] = res.shifts;
        const allAttendances: any[] = res.attendances;
        const leaves: Leave[] = res.leaves;

        // Generate virtual shifts for month view
        const virtualShifts: Shift[] = [];
        const viewStart = new Date(startStr);
        const viewEnd = new Date(endStr);
        viewEnd.setHours(23, 59, 59, 999);

        leaves.forEach(leave => {
          const leaveStart = new Date(leave.startDate);
          leaveStart.setHours(0, 0, 0, 0);
          const leaveEnd = new Date(leave.endDate);
          leaveEnd.setHours(23, 59, 59, 999);

          if (leaveStart <= viewEnd && leaveEnd >= viewStart) {
            let current = new Date(Math.max(leaveStart.getTime(), viewStart.getTime()));
            const stopDate = new Date(Math.min(leaveEnd.getTime(), viewEnd.getTime()));
            
            while (current <= stopDate) {
              const dateStr = toLocalYYYYMMDD(current);
              virtualShifts.push({
                _id: `VIRTUAL_LEAVE_${leave._id}_${dateStr}`,
                personnelId: this.selectedPersonnelMonth!._id,
                date: current.toISOString(),
                startTime: '08:00',
                endTime: '17:00',
                type: 'LEAVE',
                notes: `Auto: Congé Accordé`
              });
              current.setDate(current.getDate() + 1);
            }
          }
        });

        const shifts = [...dbShifts, ...virtualShifts];

        // Filter for this specific user
        const userShifts = shifts.filter(s => 
          (typeof s.personnelId === 'string' ? s.personnelId : (s.personnelId as any)._id) === this.selectedPersonnelMonth!._id
        );
        const userAttendances = allAttendances.filter(a =>
          (typeof a.employeeId === 'string' ? a.employeeId : (a.employeeId as any)._id) === this.selectedPersonnelMonth!._id
        );

        this.monthCalendarDays = [];
        const current = new Date(startDate);
        
        // Reset KPIs
        this.monthKPIs = { workedDays: 0, totalHours: 0, absences: 0, lateArrivals: 0 };

      while (current <= endDate) {
        const dateStr = toLocalYYYYMMDD(current);
        const dayShifts = userShifts.filter(s => s.date.includes(dateStr));
        const dayAttendances = userAttendances.filter(a => toLocalYYYYMMDD(a.punchTime) === dateStr);
        
        const isCurrentMonth = current.getMonth() === month;

        this.monthCalendarDays.push({
          date: new Date(current),
          shifts: dayShifts,
          attendances: dayAttendances,
          isCurrentMonth: isCurrentMonth
        });

        // Calculate KPIs only for days inside the active month
        if (isCurrentMonth) {
          dayShifts.forEach((shift: Shift) => {
             if (shift.type === 'ABSENT' || shift.type === 'SICK') {
               this.monthKPIs.absences++;
             } else {
               const start = this.timeToDate(shift.startTime);
               const end = this.timeToDate(shift.endTime);
               const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
               if (diffHours > 0) {
                 this.monthKPIs.totalHours += diffHours;
               }

               // Late arrivals calculation based on company settings
               if (this.companySettings && shift.type !== 'HOLIDAY' && shift.type !== 'LEAVE') {
                 const dayOfWeek = current.getDay();
                 const schedule = this.companySettings.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
                 
                 if (schedule && schedule.isActive) {
                   const startHour = start.getHours();
                   let expectedStart: Date | null = null;
                   
                   // Determine if shift corresponds to morning or afternoon expected schedule
                   if (startHour < 13 && schedule.morningStart) {
                     expectedStart = this.timeToDate(schedule.morningStart);
                   } else if (startHour >= 13 && schedule.afternoonStart) {
                     expectedStart = this.timeToDate(schedule.afternoonStart);
                   }

                   if (expectedStart) {
                     // Add grace period to expected start time
                     expectedStart.setMinutes(expectedStart.getMinutes() + this.companySettings.latenessGracePeriodMinutes);
                     if (start > expectedStart) {
                       this.monthKPIs.lateArrivals++;
                     }
                   }
                 }
               }
             }
          });
          
          if (dayShifts.some(s => s.type !== 'ABSENT' && s.type !== 'SICK') || dayAttendances.length > 0) {
              this.monthKPIs.workedDays++;
          }
        }

        current.setDate(current.getDate() + 1);
      }
      
      this.monthKPIs.totalHours = Math.round(this.monthKPIs.totalHours * 10) / 10;
      });
    });
  }

  private timeToDate(timeStr: string): Date {
    const d = new Date();
    const [h, m] = timeStr.split(':');
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    d.setSeconds(0);
    return d;
  }

  getDateKey(date: Date): string {
    return toLocalYYYYMMDD(date);
  }



  downloadGlobalMonthPDF(): void {
    if (this.weekDays.length === 0) return; // Assuming weekDays is available in the class
    this.isGeneratingGlobalPDF = true;
    this.currentDate = new Date(); // Assuming currentDate is available in the class
    
    const viewedMonthDate = this.weekDays[0];
    const year = viewedMonthDate.getFullYear();
    const month = viewedMonthDate.getMonth();
    
    // Explicit first day and last day covering the entire month
    const startStr = toLocalYYYYMMDD(new Date(year, month, 1));
    const endStr = toLocalYYYYMMDD(new Date(year, month + 1, 0));

    import('rxjs').then(({ forkJoin }) => {
      forkJoin({
        shifts: this.planningService.getShifts(startStr, endStr),
        attendances: this.planningService.getAttendances(startStr, endStr),
        leaves: this.leaveService.getAll({ status: 'APPROVED' })
      }).subscribe(res => {
        const allShifts = res.shifts;
        const allAttendances = res.attendances;
        const allLeaves = res.leaves;

        const reportData: any[] = [];

        this.personnelList.filter(p => p.isActive).forEach(person => { // Assuming personnelList is available in the class
          const personId = person._id!;
          
          // Virtual leaves for the month
          const virtualShifts: Shift[] = [];
          const userLeaves = allLeaves.filter(l => (typeof l.employeeId === 'string' ? l.employeeId : (l.employeeId as any)._id) === personId);
          userLeaves.forEach(leave => {
            const leaveStart = new Date(leave.startDate); leaveStart.setHours(0,0,0,0);
            const leaveEnd = new Date(leave.endDate); leaveEnd.setHours(23,59,59,999);
            const viewStart = new Date(`${startStr}T00:00:00`);
            const viewEnd = new Date(`${endStr}T23:59:59`);
            
            if (leaveStart <= viewEnd && leaveEnd >= viewStart) {
              let current = new Date(Math.max(leaveStart.getTime(), viewStart.getTime()));
              const stopDate = new Date(Math.min(leaveEnd.getTime(), viewEnd.getTime()));
              while (current <= stopDate) {
                virtualShifts.push({
                   _id: `V_LEAVE_${leave._id}`, personnelId: personId, date: current.toISOString(),
                   startTime: '08:00', endTime: '17:00', type: 'LEAVE'
                });
                current.setDate(current.getDate() + 1);
              }
            }
          });

          const userShifts = [
            ...allShifts.filter(s => (typeof s.personnelId === 'string' ? s.personnelId : (s.personnelId as any)._id) === personId), 
            ...virtualShifts
          ];
          const userAttendances = allAttendances.filter(a => (typeof a.employeeId === 'string' ? a.employeeId : (a.employeeId as any)._id) === personId);

          const kpis = { workedDays: 0, totalHours: 0, absences: 0, lateArrivals: 0 };
          
          let iterDate = new Date(year, month, 1);
          const stopMonthDate = new Date(year, month + 1, 0);
          
          while (iterDate <= stopMonthDate) {
            const dateStr = toLocalYYYYMMDD(iterDate);
            const dayShifts = userShifts.filter(s => s.date.includes(dateStr));
            const dayAttendances = userAttendances.filter(a => toLocalYYYYMMDD(a.punchTime) === dateStr);
            
            dayShifts.forEach(shift => {
              if (shift.type === 'ABSENT' || shift.type === 'SICK' || shift.type === 'LEAVE') {
                kpis.absences++;
              } else {
                const start = this.timeToDate(shift.startTime);
                const end = this.timeToDate(shift.endTime);
                const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                if (diffHours > 0) kpis.totalHours += diffHours;
                
                if (this.companySettings && shift.type !== 'HOLIDAY') { // Assuming companySettings is available
                  const schedule = this.companySettings.weeklySchedule.find(s => s.dayOfWeek === iterDate.getDay());
                  if (schedule && schedule.isActive) {
                    const expectedStart = new Date(iterDate);
                    const [h, m] = shift.startTime.split(':');
                    expectedStart.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                    
                    const sortedIns = dayAttendances.filter(a => a.type === 'IN').sort((a,b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
                    if (sortedIns.length > 0) {
                      const firstPunchIn = sortedIns[0];
                      const punchTime = new Date(firstPunchIn.punchTime);
                      const gracePeriod = this.companySettings.latenessGracePeriodMinutes || 15;
                      const diffMinutes = (punchTime.getTime() - expectedStart.getTime()) / (1000 * 60);
                      if (diffMinutes > gracePeriod) kpis.lateArrivals++;
                    } else {
                      kpis.absences++;
                    }
                  }
                }
              }
            });
            
            if (dayAttendances.length > 0) kpis.workedDays++;
            iterDate.setDate(iterDate.getDate() + 1);
          }
          
          reportData.push({ employee: person, kpis });
        });

        this.globalMonthReportData = reportData;

        // Render PDF
        setTimeout(() => {
          const element = document.getElementById('global-month-export-container');
          if (!element) {
            this.isGeneratingGlobalPDF = false;
            return;
          }
          const opt: any = {
            margin:       10,
            filename:     `Rapport_Global_RH_${startStr.substring(0,7)}.pdf`,
            image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' as 'landscape' }
          };

          html2pdf().from(element).set(opt).save().then(() => {
            this.isGeneratingGlobalPDF = false;
          }).catch(() => {
             this.isGeneratingGlobalPDF = false;
          });
        }, 500);

      });
    });
  }

  prevEmployeeMonth(): void {
    this.monthViewDate = new Date(this.monthViewDate.getFullYear(), this.monthViewDate.getMonth() - 1, 1);
    this.loadEmployeeMonthData();
  }

  nextEmployeeMonth(): void {
    this.monthViewDate = new Date(this.monthViewDate.getFullYear(), this.monthViewDate.getMonth() + 1, 1);
    this.loadEmployeeMonthData();
  }

  downloadPDF(): void {
    if (!this.selectedPersonnelMonth) return;

    // We build a pristine, strictly inline-styled HTML container for html2pdf
    
    // 1. Generate the HTML for the KPIs (Ultra Premium Design)
    const kpiHtml = `
      <div style="display: flex; gap: 20px; margin-bottom: 40px;">
        <div style="flex: 1; padding: 20px 24px; background: #251e35; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(91, 66, 176, 0.2); display: flex; align-items: center; justify-content: center; color: #a98aec; font-weight: bold;">H</div>
            <div style="color: #a09eb6; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Heures trav.</div>
          </div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 800;">${this.monthKPIs.totalHours}<span style="font-size: 18px; color: #8e6ee0; margin-left: 4px;">h</span></div>
        </div>
        
        <div style="flex: 1; padding: 20px 24px; background: #251e35; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(3, 218, 198, 0.2); display: flex; align-items: center; justify-content: center; color: #03dac6; font-weight: bold;">J</div>
            <div style="color: #a09eb6; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Jours présents</div>
          </div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 800;">${this.monthKPIs.workedDays}<span style="font-size: 18px; color: #03dac6; margin-left: 4px;">j</span></div>
        </div>
        
        <div style="flex: 1; padding: 20px 24px; background: #251e35; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(207, 102, 121, 0.2); display: flex; align-items: center; justify-content: center; color: #ff8fa3; font-weight: bold;">A</div>
            <div style="color: #a09eb6; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Absences</div>
          </div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 800;">${this.monthKPIs.absences}<span style="font-size: 18px; color: #cf6679; margin-left: 4px;">j</span></div>
        </div>
        
        <div style="flex: 1; padding: 20px 24px; background: #251e35; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 152, 0, 0.2); display: flex; align-items: center; justify-content: center; color: #ffb74d; font-weight: bold;">R</div>
            <div style="color: #a09eb6; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Retards</div>
          </div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 800;">${this.monthKPIs.lateArrivals}<span style="font-size: 18px; color: #ff9800; margin-left: 4px;">x</span></div>
        </div>
      </div>
    `;

    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    let calendarHtml = `
      <div style="background-color: #1a1525; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
        <div style="display: flex; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.1);">
          ${dayNames.map(d => `<div style="flex: 1; padding: 14px 10px; text-align: center; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${d}</div>`).join('')}
        </div>
        <div style="display: flex; flex-wrap: wrap;">
    `;

    this.monthCalendarDays.forEach((day, index) => {
      const isLastColumn = (index + 1) % 7 === 0;
      const isBottomRow = index >= this.monthCalendarDays.length - 7;
      const rightBorder = isLastColumn ? 'none' : '1px solid rgba(255,255,255,0.05)';
      const bottomBorder = isBottomRow ? 'none' : '1px solid rgba(255,255,255,0.05)';
      const bgColor = day.isCurrentMonth ? '#1a1525' : '#130e1d';
      const textColor = day.isCurrentMonth ? '#ffffff' : '#4a455a';
      const opacityStyle = day.isCurrentMonth ? '1' : '0.4';

      let shiftsHtml = day.shifts.map((shift: Shift) => {
        let bgStyle = 'background-color: rgba(91, 66, 176, 0.15); color: #b7a0f0; border-left: 3px solid #8e6ee0;';
        if (shift.type === 'OVERTIME') bgStyle = 'background-color: rgba(255, 152, 0, 0.15); color: #ffb74d; border-left: 3px solid #ff9800;';
        else if (shift.type === 'LEAVE') bgStyle = 'background-color: rgba(3, 218, 198, 0.15); color: #64ffda; border-left: 3px solid #03dac6;';
        else if (shift.type === 'SICK' || shift.type === 'ABSENT') bgStyle = 'background-color: rgba(207, 102, 121, 0.15); color: #ff8fa3; border-left: 3px solid #cf6679;';
        else if (shift.type === 'HOLIDAY') bgStyle = 'background-color: rgba(255, 255, 255, 0.05); color: #d0cce6; border-left: 3px solid #6b6680;';
        
        let typeStr: string = shift.type;
        if (shift.type === 'OVERTIME') typeStr = 'Heure Sup.';
        if (shift.type === 'LEAVE') typeStr = 'Congé';
        if (shift.type === 'SICK') typeStr = 'Maladie';
        if (shift.type === 'ABSENT') typeStr = 'Absent';
        if (shift.type === 'HOLIDAY') typeStr = 'Jour Férié';
        if (shift.type === 'NORMAL') typeStr = 'Session Std.';

        return `
          <div style="${bgStyle} padding: 6px 8px; border-radius: 6px; margin-bottom: 6px; font-family: Inter, sans-serif;">
            <div style="font-size: 11px; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.5px;">${shift.startTime} <span style="opacity:0.5">-</span> ${shift.endTime}</div>
            <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">${typeStr}</div>
          </div>
        `;
      }).join('');
      let attendancesHtml = day.attendances && day.attendances.length ? day.attendances.map((att: any) => {
        let bgStyle = 'background-color: rgba(91, 66, 176, 0.1); color: #a98aec; border-left: 2px solid #8e6ee0;';
        let lbl = 'ARR';
        if (att.type === 'OUT') {
          bgStyle = 'background-color: rgba(255, 183, 77, 0.1); color: #ffcc80; border-left: 2px solid #ffb74d;';
          lbl = 'DÉP';
        }
        const time = new Date(att.punchTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div style="${bgStyle} display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-radius: 4px; margin-bottom: 4px; margin-top: 4px; font-family: Inter, sans-serif;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">${time}</div>
            <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; opacity: 0.8;">${lbl}</div>
          </div>
        `;
      }).join('') : '';

      calendarHtml += `
        <div style="width: calc(100% / 7); min-height: 120px; box-sizing: border-box; padding: 12px; border-right: ${rightBorder}; border-bottom: ${bottomBorder}; background-color: ${bgColor};">
          <div style="text-align: right; color: ${textColor}; font-weight: 800; font-size: 16px; margin-bottom: 12px; opacity: ${opacityStyle}; font-family: 'Outfit', sans-serif;">${day.date.getDate()}</div>
          <div style="opacity: ${opacityStyle};">${shiftsHtml}${attendancesHtml}</div>
        </div>
      `;
    });

    calendarHtml += `
        </div>
      </div>
    `;

    const monthNamesFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthLabel = `${monthNamesFr[this.monthViewDate.getMonth()]} ${this.monthViewDate.getFullYear()}`;
    const generationDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    
    // Create the container strictly to 1400px width for a sharp landscape render
    const printContainer = document.createElement('div');
    printContainer.style.width = '1400px'; 
    printContainer.style.padding = '40px 50px';
    printContainer.style.backgroundColor = '#130e1d';
    printContainer.style.fontFamily = 'Inter, Roboto, sans-serif';
    printContainer.style.boxSizing = 'border-box';
    printContainer.style.margin = '0 auto';

    printContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #8e6ee0; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Rapport Mensuel</div>
          <h2 style="color: #ffffff; font-size: 36px; font-weight: 800; margin: 0 0 4px 0; font-family: 'Outfit', sans-serif;">${this.selectedPersonnelMonth.firstName} ${this.selectedPersonnelMonth.lastName}</h2>
          <h3 style="color: #a09eb6; font-size: 18px; font-weight: 500; margin: 0;">Rôle: <span style="color: #ffffff;">${this.selectedPersonnelMonth.position}</span></h3>
        </div>
        <div style="text-align: right;">
          <div style="color: #ffffff; font-size: 28px; font-weight: 800; font-family: 'Outfit', sans-serif; margin-bottom: 4px;">${monthLabel}</div>
          <div style="color: #6b6680; font-size: 12px;">Généré le ${generationDate}</div>
        </div>
      </div>
      ${kpiHtml}
      ${calendarHtml}
      <div style="margin-top: 30px; text-align: center; color: #4a455a; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
        Document confidentiel - TimeShift RH
      </div>
    `;

    // CREATE LOADING OVERLAY to hide the flash
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = '#1a1525';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.flexDirection = 'column';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = 'Inter, sans-serif';
    overlay.innerHTML = `
      <div style="width: 48px; height: 48px; border: 4px solid rgba(142, 110, 224, 0.3); border-top-color: #8e6ee0; border-radius: 50%; animation: spinPdf 1s linear infinite;"></div>
      <h3 style="margin-top: 24px; font-weight: 600;">Génération du PDF...</h3>
      <p style="color: #a09eb6; font-size: 14px; margin-top: 8px;">Veuillez patienter quelques instants.</p>
      <style>@keyframes spinPdf { 100% { transform: rotate(360deg); } }</style>
    `;

    document.body.appendChild(overlay);

    // Completely remove the main app from the layout flow
    const appRoot = document.querySelector('app-root') as HTMLElement;
    let oldDisplay = '';
    if (appRoot) {
      oldDisplay = appRoot.style.display;
      appRoot.style.display = 'none';
    }

    // Now printContainer is the ONLY thing in the document flow
    document.body.appendChild(printContainer);
    
    // Explicitly scroll to top so canvas doesn't offset
    window.scrollTo(0, 0);

    const opt: any = {
      margin:       0,
      filename:     `Rapport_Mensuel_${this.selectedPersonnelMonth.firstName}_${this.selectedPersonnelMonth.lastName}.pdf`,
      image:        { type: 'jpeg' as 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, logging: true, scrollY: 0, scrollX: 0 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    setTimeout(() => {
      html2pdf().set(opt).from(printContainer).save().then(() => {
          if (appRoot) {
            appRoot.style.display = oldDisplay;
          }
          document.body.removeChild(printContainer);
          document.body.removeChild(overlay);
      }).catch((err: any) => {
          console.error('PDF Generation Error:', err);
          if (appRoot) {
            appRoot.style.display = oldDisplay;
          }
          document.body.removeChild(printContainer);
          document.body.removeChild(overlay);
      });
    }, 500);
  }

  deleteShift(shift: Shift): void {
    if (shift._id?.startsWith('VIRTUAL_LEAVE_')) {
      alert("Il s'agit d'un congé importé automatiquement depuis le module 'Congés'. Vous devez aller dans Gestion des Congés pour l'annuler ou le modifier.");
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'dark-mauve-dialog',
      disableClose: true,
      data: {
        title: 'Supprimer le créneau ?',
        message: `Voulez-vous supprimer ce créneau de ${shift.startTime} à ${shift.endTime} ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && shift._id) {
        this.planningService.deleteShift(shift._id).subscribe({
          next: () => this.loadData(),
          error: (err) => console.error('Erreur lors de la suppression du créneau', err)
        });
      }
    });
  }

  exportToExcel(): void {
    if (this.shifts.length === 0) {
      alert("Aucune donnée à exporter.");
      return;
    }

    // 1. Prepare data rows
    const exportData = this.shifts.map(s => {
      const p = s.personnelId as any;
      const employeeName = p ? `${p.firstName} ${p.lastName}` : 'Inconnu';
      
      let typeFr: string = s.type;
      switch(s.type) {
        case 'NORMAL': typeFr = 'Travail Normal'; break;
        case 'OVERTIME': typeFr = 'Heures Supplémentaires'; break;
        case 'LEAVE': typeFr = 'Congé Payé'; break;
        case 'SICK': typeFr = 'Maladie'; break;
        case 'ABSENT': typeFr = 'Absence'; break;
        case 'HOLIDAY': typeFr = 'Jour Férié'; break;
      }

      return {
        'Employé': employeeName,
        'Date': s.date,
        'Heure de début': s.startTime,
        'Heure de fin': s.endTime,
        'Nature': typeFr,
        'Notes': s.notes || ''
      };
    });

    // 2. Create worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);

    // 3. Customize column widths for a premium look
    const colWidths = [
      { wch: 25 }, // Employé
      { wch: 15 }, // Date
      { wch: 15 }, // Début
      { wch: 15 }, // Fin
      { wch: 25 }, // Nature
      { wch: 40 }  // Notes
    ];
    worksheet['!cols'] = colWidths;

    // 4. Create workbook
    const workbook: XLSX.WorkBook = { Sheets: { 'Planning': worksheet }, SheetNames: ['Planning'] };

    // 5. Generate Excel file and trigger download
    // Using simple writeFile which relies on browser's native download
    const fileName = `Planning_Export_${toLocalYYYYMMDD(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}
