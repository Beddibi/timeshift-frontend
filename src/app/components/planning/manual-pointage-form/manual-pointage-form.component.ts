import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideAngularModule, Clock, User, LogIn, LogOut, FileText, CheckCircle, X } from 'lucide-angular';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { PlanningService } from '../../../services/planning.service';
import { PersonnelService } from '../../../services/personnel.service';
import { Personnel } from '../../../models/personnel.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-manual-pointage-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './manual-pointage-form.component.html',
  styleUrl: './manual-pointage-form.component.scss'
})
export class ManualPointageFormComponent implements OnInit, OnChanges {
  @Input() editData: any = null;
  @Input() initialDate: Date = new Date();
  @Input() initialPersonnelId: string = '';
  
  @Output() pointageSaved = new EventEmitter<any>();
  @Output() formClosed = new EventEmitter<void>();

  pointageForm: FormGroup;
  personnelList: Personnel[] = [];
  isLoading = false;

  readonly clockIcon = Clock;
  readonly userIcon = User;
  readonly inIcon = LogIn;
  readonly outIcon = LogOut;
  readonly fileIcon = FileText;
  readonly checkIcon = CheckCircle;
  readonly xIcon = X;

  constructor(
    private fb: FormBuilder,
    private planningService: PlanningService,
    private personnelService: PersonnelService,
    private dialog: MatDialog
  ) {
    this.pointageForm = this.fb.group({
      employeeId: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      type: ['IN', Validators.required],
      deviceId: ['manual']
    });
  }

  ngOnInit(): void {
    this.personnelService.getPersonnel().subscribe(p => this.personnelList = p);
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editData'] || changes['initialDate'] || changes['initialPersonnelId']) {
      this.initForm();
    }
  }

  initForm(): void {
    if (!this.pointageForm) return;

    if (this.editData && this.editData._id) {
      const punchDate = new Date(this.editData.punchTime);
      this.pointageForm.patchValue({
        employeeId: typeof this.editData.employeeId === 'object' ? this.editData.employeeId._id : this.editData.employeeId,
        date: punchDate.toISOString().split('T')[0],
        time: punchDate.toTimeString().substring(0, 5),
        type: this.editData.type,
        deviceId: this.editData.deviceId || 'manual'
      });
    } else {
      this.pointageForm.patchValue({
        date: this.initialDate ? this.initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'IN',
        employeeId: this.initialPersonnelId || '',
        deviceId: 'manual'
      });
    }
  }

  getSelectedPersonnelName(): string {
    const id = this.pointageForm.get('employeeId')?.value;
    if (!id) return '';
    const p = this.personnelList.find(x => x._id === id);
    return p ? `${p.firstName} ${p.lastName}` : '';
  }

  isFixedEmployee(): boolean {
    return !!(this.editData && this.editData._id) || !!this.initialPersonnelId;
  }

  getSelectedPersonnel(): Personnel | null {
    const id = this.pointageForm.get('employeeId')?.value;
    if (!id) return null;
    return this.personnelList.find(x => x._id === id) || null;
  }

  onSubmit(): void {
    if (this.pointageForm.invalid) return;
    this.isLoading = true;

    const val = this.pointageForm.value;
    const punchTime = new Date(`${val.date}T${val.time}`);

    const payload = {
      employeeId: val.employeeId,
      punchTime: punchTime.toISOString(),
      type: val.type,
      deviceId: val.deviceId,
      method: 'MANUAL'
    };

    if (this.editData && this.editData._id) {
      this.planningService.updateAttendance(this.editData._id, payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.pointageSaved.emit(res);
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
    } else {
      this.planningService.createManualAttendance(payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.pointageSaved.emit(res);
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }

  deletePointage(): void {
    if (!this.editData || !this.editData._id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      data: {
        title: 'Supprimer le pointage',
        message: 'Êtes-vous sûr de vouloir supprimer ce pointage ? Cette action est irréversible.',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.planningService.deleteAttendance(this.editData._id).subscribe({
          next: (res) => {
            this.isLoading = false;
            this.pointageSaved.emit(res); // or emit a separate event for deletion
          },
          error: (err) => {
            console.error(err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  close(): void {
    this.formClosed.emit();
  }
}
