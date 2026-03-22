import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-angular';

export interface AlertDialogData {
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  buttonText?: string;
}

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, LucideAngularModule],
  templateUrl: './alert-dialog.component.html',
  styleUrl: './alert-dialog.component.scss'
})
export class AlertDialogComponent {
  readonly alertIcon = AlertCircle;
  readonly successIcon = CheckCircle2;
  readonly infoIcon = Info;
  readonly errorIcon = XCircle;

  constructor(
    public dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getIcon() {
    switch(this.data.type) {
      case 'success': return this.successIcon;
      case 'error': return this.errorIcon;
      case 'info': return this.infoIcon;
      case 'warning':
      default: return this.alertIcon;
    }
  }
}
