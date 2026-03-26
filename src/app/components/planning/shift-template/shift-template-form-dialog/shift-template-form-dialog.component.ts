import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, X, Plus, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-shift-template-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    LucideAngularModule
  ],
  templateUrl: './shift-template-form-dialog.component.html',
  styleUrl: './shift-template-form-dialog.component.scss'
})
export class ShiftTemplateFormDialogComponent implements OnInit {
  readonly closeIcon = X;
  readonly plusIcon = Plus;
  readonly deleteIcon = Trash2;

  templateForm: FormGroup;
  daysOfWeek = [
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' },
    { value: 0, label: 'Dimanche' }
  ];

  shiftTypes = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'OVERTIME', label: 'Heures Sup' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ShiftTemplateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      slots: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (this.data.template) {
      this.templateForm.patchValue({
        name: this.data.template.name,
        description: this.data.template.description
      });
      this.data.template.slots.forEach((slot: any) => {
        this.addSlot(slot);
      });
    } else {
      // Add a default slot for Monday
      this.addSlot({ dayOfWeek: 1, startTime: '08:00', endTime: '16:00', type: 'NORMAL' });
    }
  }

  get slots(): FormArray {
    return this.templateForm.get('slots') as FormArray;
  }

  addSlot(slot: any = { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', type: 'NORMAL' }): void {
    const slotGroup = this.fb.group({
      dayOfWeek: [slot.dayOfWeek, Validators.required],
      startTime: [slot.startTime, Validators.required],
      endTime: [slot.endTime, Validators.required],
      type: [slot.type || 'NORMAL', Validators.required]
    });
    this.slots.push(slotGroup);
  }

  removeSlot(index: number): void {
    this.slots.removeAt(index);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.templateForm.valid) {
      this.dialogRef.close(this.templateForm.value);
    }
  }
}
