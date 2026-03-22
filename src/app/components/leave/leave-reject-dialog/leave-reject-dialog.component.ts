import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideAngularModule, XCircle, AlertTriangle, MessageSquare, X } from 'lucide-angular';
import { Leave } from '../../../services/leave.service';

export interface LeaveRejectDialogData {
  leave: Leave;
  employeeName: string;
}

@Component({
  selector: 'app-leave-reject-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    LucideAngularModule
  ],
  templateUrl: './leave-reject-dialog.component.html',
  styleUrl: './leave-reject-dialog.component.scss'
})
export class LeaveRejectDialogComponent {
  rejectionNote: string = '';
  
  // Icons
  closeIcon = X;
  rejectIcon = XCircle;
  warningIcon = AlertTriangle;
  messageIcon = MessageSquare;

  constructor(
    public dialogRef: MatDialogRef<LeaveRejectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeaveRejectDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.rejectionNote.trim().length > 0) {
      this.dialogRef.close(this.rejectionNote);
    }
  }
}
