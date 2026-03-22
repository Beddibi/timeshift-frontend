import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideAngularModule, Calendar, FileText, User, X, Clock, AlertCircle, Search } from 'lucide-angular';
import { Personnel } from '../../../models/personnel.model';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface LeaveFormDialogData {
  personnelList: Personnel[];
  leave?: any; // To support editing later if needed, but primarily for creation
}

@Component({
  selector: 'app-leave-form-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    LucideAngularModule
  ],
  templateUrl: './leave-form-dialog.component.html',
  styleUrl: './leave-form-dialog.component.scss'
})
export class LeaveFormDialogComponent implements OnInit {
  leaveForm: FormGroup;
  personnelList: Personnel[] = [];

  // Icons
  calendarIcon = Calendar;
  fileTextIcon = FileText;
  userIcon = User;
  clockIcon = Clock;
  alertIcon = AlertCircle;
  closeIcon = X;
  searchIcon = Search;

  minDate = new Date(); // Blocks past dates
  employeeSearchCtrl = new FormControl('');
  filteredPersonnel!: Observable<Personnel[]>;

  leaveTypes = [
    { value: 'ANNUAL', label: 'Congé Annuel' },
    { value: 'SICK', label: 'Congé Maladie' },
    { value: 'PERSONAL', label: 'Congé Personnel' },
    { value: 'MATERNITY', label: 'Congé Maternité' },
    { value: 'UNPAID', label: 'Congé Sans Solde' },
    { value: 'OTHER', label: 'Autre' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LeaveFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeaveFormDialogData
  ) {
    this.personnelList = data.personnelList || [];

    this.leaveForm = this.fb.group({
      employeeId: ['', Validators.required],
      leaveType: ['ANNUAL', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: ['']
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    // Autocomplete filter logic
    this.filteredPersonnel = this.employeeSearchCtrl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : (value as any)?.firstName;
        return name ? this._filter(name as string) : this.personnelList.slice();
      }),
    );

    // Watch employeeSearchCtrl to patch the real form ID
    this.employeeSearchCtrl.valueChanges.subscribe((val: any) => {
       if (typeof val === 'object' && val !== null) {
          this.leaveForm.patchValue({ employeeId: (val as Personnel)._id });
       } else {
          this.leaveForm.patchValue({ employeeId: '' });
       }
    });

    if (this.data.leave) {
      const empId = typeof this.data.leave.employeeId === 'string' ? this.data.leave.employeeId : this.data.leave.employeeId?._id;
      const empObj = this.personnelList.find(p => p._id === empId);
      
      if (empObj) this.employeeSearchCtrl.setValue(empObj as any);

      this.leaveForm.patchValue({
        employeeId: empId,
        leaveType: this.data.leave.leaveType,
        startDate: new Date(this.data.leave.startDate),
        endDate: new Date(this.data.leave.endDate),
        reason: this.data.leave.reason
      });
    }
  }

  private _filter(name: string): Personnel[] {
    const filterValue = name.toLowerCase();
    return this.personnelList.filter(option => 
      option.firstName.toLowerCase().includes(filterValue) || 
      option.lastName.toLowerCase().includes(filterValue)
    );
  }

  displayFn(emp: Personnel): string {
    return emp && emp.firstName ? `${emp.firstName} ${emp.lastName}` : '';
  }

  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('startDate')?.value;
    const end = control.get('endDate')?.value;
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate > endDate) {
        return { dateRangeInvalid: true };
      }
    }
    return null;
  }

  get calculatedDays(): number {
    const start = this.leaveForm.get('startDate')?.value;
    const end = this.leaveForm.get('endDate')?.value;
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) return 0;

    const diff = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  onSubmit(): void {
    if (this.leaveForm.valid) {
      this.dialogRef.close({
        ...this.leaveForm.value,
        totalDays: this.calculatedDays
      });
    } else {
      this.leaveForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
