import { Component, OnInit, Inject, Optional, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, X, CalendarClock, Clock, AlignLeft, User, CalendarDays, Check, AlertCircle, ArrowLeft, Search, Briefcase, FileText, HeartPulse, Slash, Navigation } from 'lucide-angular';
import { PlanningService, Shift } from '../../../services/planning.service';
import { PersonnelService } from '../../../services/personnel.service';
import { SettingsService, CompanySettings } from '../../../services/settings.service';
import { Personnel } from '../../../models/personnel.model';
import { AlertDialogComponent } from '../../shared/alert-dialog/alert-dialog.component';
import { MatDialog } from '@angular/material/dialog';

// Helper to avoid timezone offset bugs (e.g., 00:00:00 GMT+1 becoming 23:00:00 GMT the previous day in ISO)
const toLocalYYYYMMDD = (d: Date | string): string => {
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    LucideAngularModule
  ],
  templateUrl: './shift-form.component.html',
  styleUrl: './shift-form.component.scss'
})
export class ShiftFormComponent implements OnInit, OnChanges {
  @Input() editShiftData: Shift | null = null;
  @Input() initialPersonnelId: string = '';
  @Input() initialDate: Date = new Date();
  
  @Output() formClosed = new EventEmitter<void>();
  @Output() shiftSaved = new EventEmitter<Shift>();

  shiftForm: FormGroup;
  personnelList: Personnel[] = [];
  filteredPersonnel: Personnel[] = [];
  selectedPersonnelIds: string[] = [];
  searchQuery: string = '';
  companySettings: CompanySettings | null = null;
  selectedDayIsClosed = false;
  isRoutedMode = false;
  routedShiftId: string | null = null;
  isLoading = false;
  
  readonly closeIcon = X;
  readonly calendarIcon = CalendarClock;
  readonly clockIcon = Clock;
  readonly notesIcon = AlignLeft;
  readonly userIcon = User;
  readonly dayIcon = CalendarDays;
  readonly checkIcon = Check;
  readonly alertIcon = AlertCircle;
  readonly arrowLeftIcon = ArrowLeft;
  readonly searchIcon = Search;
  
  // Nature icons
  readonly normalIcon = Briefcase;
  readonly overtimeIcon = Clock;
  readonly leaveIcon = Navigation;
  readonly sickIcon = HeartPulse;
  readonly absentIcon = Slash;
  readonly holidayIcon = CalendarClock;

  private isDialogMode = false;

  constructor(
    private fb: FormBuilder,
    @Optional() private dialogRef: MatDialogRef<ShiftFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private planningService: PlanningService,
    private personnelService: PersonnelService,
    private settingsService: SettingsService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.isDialogMode = !!this.dialogRef;
    
    this.shiftForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      startTime: ['09:00', Validators.required],
      endTime: ['17:00', Validators.required],
      type: ['NORMAL', Validators.required],
      period: ['FULL_DAY', Validators.required],
      notes: ['']
    });

    this.shiftForm.get('startDate')?.valueChanges.subscribe(() => this.recalculateTimes());
    this.shiftForm.get('period')?.valueChanges.subscribe(() => this.recalculateTimes());
  }

  ngOnInit(): void {
    this.personnelService.getPersonnel().subscribe(data => {
      this.personnelList = data;
      this.filteredPersonnel = data;
    });

    this.settingsService.getSettings().subscribe(settings => {
      this.companySettings = settings;
      this.checkRoutingMode();
    });

    if (this.isDialogMode) {
      this.initFromDialogData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isDialogMode && !this.isRoutedMode && (changes['editShiftData'] || changes['initialPersonnelId'] || changes['initialDate'])) {
      this.initFromInputs();
    }
  }

  filterPersonnel(event: Event): void {
    const target = event.target as HTMLInputElement;
    const q = target.value.toLowerCase();
    this.searchQuery = q;
    this.filteredPersonnel = this.personnelList.filter(p => 
      p.firstName.toLowerCase().includes(q) || 
      p.lastName.toLowerCase().includes(q) ||
      (p.position && p.position.toLowerCase().includes(q))
    );
  }

  togglePersonnel(id: string | undefined): void {
    if(!id) return;
    if(this.isEditing) {
      this.selectedPersonnelIds = [id];
      return;
    }
    const idx = this.selectedPersonnelIds.indexOf(id);
    if(idx > -1) {
      this.selectedPersonnelIds.splice(idx, 1);
    } else {
      this.selectedPersonnelIds.push(id);
    }
  }

  isPersonnelSelected(id: string | undefined): boolean {
    if(!id) return false;
    return this.selectedPersonnelIds.includes(id);
  }

  selectAllFiltered(): void {
    this.filteredPersonnel.forEach(p => {
      if(p._id && !this.selectedPersonnelIds.includes(p._id)) {
        this.selectedPersonnelIds.push(p._id);
      }
    });
  }

  deselectAllFiltered(): void {
    this.filteredPersonnel.forEach(p => {
      if(p._id) {
        const idx = this.selectedPersonnelIds.indexOf(p._id);
        if(idx > -1) this.selectedPersonnelIds.splice(idx, 1);
      }
    });
  }

  private checkRoutingMode(): void {
    if (this.isDialogMode) return;
    
    // Check if we are in a routed context (has param or queryParams)
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isRoutedMode = true;
        this.routedShiftId = id;
        this.loadShiftForEditing(id);
      } else {
        this.route.queryParamMap.subscribe(queryParams => {
          if (queryParams.has('date') || queryParams.has('personnelId') || this.router.url.includes('/planning/session')) {
            this.isRoutedMode = true;
            const qDate = queryParams.get('date');
            const qPersonnel = queryParams.get('personnelId');
            
            if(qPersonnel) this.selectedPersonnelIds = [qPersonnel];

            this.shiftForm.patchValue({
              startDate: qDate ? new Date(qDate) : new Date(),
              endDate: qDate ? new Date(qDate) : new Date(),
              period: 'FULL_DAY'
            });
            this.recalculateTimes();
          } else {
            this.initFromInputs();
          }
        });
      }
    });
  }

  private loadShiftForEditing(id: string): void {
    // In a real app we'd fetch the shift by ID from the backend. 
    // Since we don't have a getShiftById, we can optionally pass data via state or fetch all and filter.
    // For now, let's fetch all shifts and find it (not ideal for performance, but works as fallback).
    this.isLoading = true;
    const startStr = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const endStr = new Date(new Date().getFullYear(), 11, 31).toISOString();

    this.planningService.getShifts(startStr, endStr).subscribe({
      next: (shifts) => {
        const found = shifts.find((s: any) => s._id === id);
        if (found) {
          this.editShiftData = found;
          this.initFromInputs();
        }
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  private initFromDialogData(): void {
    if (this.data?.shift) {
      const s = this.data.shift;
      const perfId = typeof s.personnelId === 'object' ? s.personnelId._id : s.personnelId;
      this.selectedPersonnelIds = [perfId];
      this.shiftForm.patchValue({
        startDate: new Date(s.date),
        endDate: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
        period: s.period || 'FULL_DAY',
        notes: s.notes
      });
    } else {
      if(this.data?.personnelId) this.selectedPersonnelIds = [this.data.personnelId];
      this.shiftForm.patchValue({
        startDate: this.data?.date || new Date(),
        endDate: this.data?.date || new Date(),
        period: 'FULL_DAY'
      });
      if (this.companySettings) this.recalculateTimes();
    }
  }

  private initFromInputs(): void {
    if (this.editShiftData) {
      const s = this.editShiftData;
      const perfId = typeof s.personnelId === 'object' ? (s.personnelId as any)._id : s.personnelId;
      this.selectedPersonnelIds = [perfId];
      this.shiftForm.patchValue({
        startDate: new Date(s.date),
        endDate: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
        period: s.period || 'FULL_DAY',
        notes: s.notes
      });
    } else {
      if(this.initialPersonnelId) this.selectedPersonnelIds = [this.initialPersonnelId];
      this.shiftForm.patchValue({
        startDate: this.initialDate || new Date(),
        endDate: this.initialDate || new Date(),
        period: 'FULL_DAY'
      });
      if (this.companySettings) this.recalculateTimes();
    }
  }

  recalculateTimes(): void {
    if (!this.companySettings) return;

    const startVal = this.shiftForm.get('startDate')?.value;
    if (!startVal) return;

    const dayOfWeek = new Date(startVal).getDay();
    const daySettings = this.companySettings.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);

    if (!daySettings || !daySettings.isActive) {
      this.selectedDayIsClosed = true;
      return;
    }

    this.selectedDayIsClosed = false;
    const period = this.shiftForm.get('period')?.value;

    if (period === 'MORNING') {
      this.shiftForm.patchValue({ startTime: daySettings.morningStart, endTime: daySettings.morningEnd }, { emitEvent: false });
    } else if (period === 'AFTERNOON') {
      this.shiftForm.patchValue({ startTime: daySettings.afternoonStart, endTime: daySettings.afternoonEnd }, { emitEvent: false });
    } else if (period === 'FULL_DAY') {
      this.shiftForm.patchValue({ startTime: daySettings.morningStart, endTime: daySettings.afternoonEnd }, { emitEvent: false });
    }
  }

  get isEditing(): boolean {
    return this.isDialogMode ? !!(this.data?.shift) : !!this.editShiftData;
  }

  onSubmit(): void {
    if (this.shiftForm.valid && this.selectedPersonnelIds.length > 0) {
      const formVal = this.shiftForm.value;
      
      const editId = this.isDialogMode ? this.data?.shift?._id : (this.isRoutedMode ? this.routedShiftId : this.editShiftData?._id);

      this.isLoading = true;
      if (editId) {
        // Editing a single shift
        const shiftData: Partial<Shift> = {
          date: toLocalYYYYMMDD(formVal.startDate),
          startTime: formVal.startTime,
          endTime: formVal.endTime,
          type: formVal.type,
          period: formVal.period,
          notes: formVal.notes,
          personnelId: this.selectedPersonnelIds[0]
        };
        
        this.planningService.updateShift(editId, shiftData).subscribe({
          next: (result) => {
            if (this.isDialogMode) this.dialogRef?.close(result);
            else if (this.isRoutedMode) this.goBack();
            else { this.shiftSaved.emit(result); this.formClosed.emit(); }
            this.isLoading = false;
          },
          error: (err) => { console.error('Error updating shift', err); this.isLoading = false; }
        });
      } else {
        // Bulk creation (Multiple employees X Multiple days)
        const shiftsToCreate: Partial<Shift>[] = [];
        const startDateStr = toLocalYYYYMMDD(formVal.startDate);
        const endDateStr = toLocalYYYYMMDD(formVal.endDate);
        
        let currentDate = new Date(formVal.startDate);
        const endDate = new Date(formVal.endDate);
        currentDate.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          const daySettings = this.companySettings?.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
          
          let shouldCreate = true;
          if (formVal.type === 'NORMAL' && daySettings && !daySettings.isActive) {
            shouldCreate = false;
          }

          if (shouldCreate) {
             const dateStr = toLocalYYYYMMDD(currentDate);
             this.selectedPersonnelIds.forEach((id: string) => {
               shiftsToCreate.push({
                 personnelId: id,
                 date: dateStr,
                 startTime: formVal.startTime,
                 endTime: formVal.endTime,
                 type: formVal.type,
                 period: formVal.period,
                 notes: formVal.notes
               });
             });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (shiftsToCreate.length === 0) {
          this.dialog.open(AlertDialogComponent, {
            data: {
              title: 'Aucune session générée',
              message: 'Vérifiez que la période sélectionnée inclut des jours ouvrables selon les paramètres de l\'entreprise.',
              type: 'warning',
              buttonText: 'J\'ai compris'
            },
            panelClass: 'custom-dialog-container'
          });
          this.isLoading = false;
          return;
        }

        // Check for duplicates before creating
        this.planningService.getShifts(startDateStr, endDateStr).subscribe({
          next: (existingShifts) => {
              const overlapping = shiftsToCreate.filter(stc => 
                existingShifts.some(es => {
                   const isSamePerson = (typeof es.personnelId === 'object' ? (es.personnelId as any)._id : es.personnelId) === stc.personnelId;
                   const esDateStr = toLocalYYYYMMDD(es.date);
                   const isSameDate = esDateStr === stc.date;
                   if (!isSamePerson || !isSameDate) return false;

                   // Validation de chevauchement strict par HORAIRES
                   const timeToMinutes = (t: string | undefined) => {
                       if(!t) return 0;
                       const [h, m] = t.split(':').map(Number);
                       return h * 60 + m;
                   };

                   const startA = timeToMinutes(stc.startTime);
                   const endA = timeToMinutes(stc.endTime);
                   const startB = timeToMinutes(es.startTime);
                   const endB = timeToMinutes(es.endTime);

                   // Bloque si intervalle A chevauche intervalle B : startA < endB ET startB < endA
                   return startA < endB && startB < endA;
                })
             );

             if(overlapping.length > 0) {
                const uniqueDates = Array.from(new Set(overlapping.map(o => o.date)));
                
                this.dialog.open(AlertDialogComponent, {
                  data: {
                    title: 'Conflit d\'horaires détecté',
                    message: `Impossible de créer ces doublons.\n\nUn ou plusieurs employés sélectionnés ont déjà une session dont les heures se chevauchent avec celle que vous essayez d'ajouter sur les dates suivantes :\n\n${uniqueDates.join(', ')}`,
                    type: 'error',
                    buttonText: 'Compris'
                  },
                  panelClass: 'custom-dialog-container'
                });

                this.isLoading = false;
                return;
             }

             this.planningService.createBulk(shiftsToCreate).subscribe({
                next: (result) => {
                  if (this.isDialogMode) this.dialogRef?.close(result[0]);
                  else if (this.isRoutedMode) this.goBack();
                  else { this.shiftSaved.emit(result[0] || ({} as any)); this.formClosed.emit(); }
                  this.isLoading = false;
                },
                error: (err) => { console.error('Error creating shifts', err); this.isLoading = false; }
             });
          },
          error: (err) => { console.error('Error checking duplicates', err); this.isLoading = false; }
        });
      }
    }
  }

  onCancel(): void {
    if (this.isDialogMode) {
      this.dialogRef?.close();
    } else if (this.isRoutedMode) {
      this.goBack();
    } else {
      this.formClosed.emit();
    }
  }

  goBack(): void {
    this.router.navigate(['/planning']);
  }
}
