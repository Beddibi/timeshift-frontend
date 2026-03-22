import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Building, FileText, Check, X, ShieldAlert } from 'lucide-angular';
import { Department } from '../../../services/department.service';

@Component({
  selector: 'app-department-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    LucideAngularModule
  ],
  templateUrl: './department-form-dialog.component.html',
  styleUrl: './department-form-dialog.component.scss'
})
export class DepartmentFormDialogComponent implements OnInit {
  departmentForm: FormGroup;
  isEditMode: boolean = false;
  errorMessage: string | null = null;

  // Icons
  buildingIcon = Building;
  checkIcon = Check;
  closeIcon = X;
  alertIcon = ShieldAlert;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DepartmentFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { department?: Department, error?: string }
  ) {
    this.isEditMode = !!data?.department;
    if (data?.error) {
       this.errorMessage = data.error;
    }

    this.departmentForm = this.fb.group({
      name: [data?.department?.name || '', [Validators.required]],
      isActive: [data?.department ? data.department.isActive : true]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.departmentForm.valid) {
      this.dialogRef.close(this.departmentForm.value);
    } else {
      this.departmentForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
