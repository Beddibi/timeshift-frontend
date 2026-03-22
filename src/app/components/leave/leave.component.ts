import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LucideAngularModule, Calendar, Plus, Check, X, Clock, AlertTriangle, FileText, Filter, Ban, Trash2 } from 'lucide-angular';
import { LeaveService, Leave } from '../../services/leave.service';
import { PersonnelService } from '../../services/personnel.service';
import { Personnel } from '../../models/personnel.model';
import { LeaveFormDialogComponent } from './leave-form-dialog/leave-form-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { LeaveRejectDialogComponent } from './leave-reject-dialog/leave-reject-dialog.component';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent implements OnInit {
  readonly calendarIcon = Calendar;
  readonly plusIcon = Plus;
  readonly checkIcon = Check;
  readonly xIcon = X;
  readonly clockIcon = Clock;
  readonly alertIcon = AlertTriangle;
  readonly fileIcon = FileText;
  readonly filterIcon = Filter;
  readonly banIcon = Ban;
  readonly deleteIcon = Trash2;

  leaves: Leave[] = [];
  personnelList: Personnel[] = [];
  filterStatus: string = '';
  loading = true;

  leaveTypes = [
    { value: 'ANNUAL', label: 'Congé Annuel' },
    { value: 'SICK', label: 'Congé Maladie' },
    { value: 'PERSONAL', label: 'Congé Personnel' },
    { value: 'MATERNITY', label: 'Congé Maternité' },
    { value: 'UNPAID', label: 'Congé Sans Solde' },
    { value: 'OTHER', label: 'Autre' },
  ];

  constructor(
    private leaveService: LeaveService,
    private personnelService: PersonnelService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.personnelService.getPersonnel().subscribe(p => this.personnelList = p.filter(x => x.isActive));
    this.loadLeaves();
  }

  loadLeaves(): void {
    this.loading = true;
    const filters: any = {};
    if (this.filterStatus) filters.status = this.filterStatus;
    this.leaveService.getAll(filters).subscribe({
      next: data => { this.leaves = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getPersonnelName(emp: any): string {
    if (!emp) return 'Inconnu';
    if (typeof emp === 'string') {
      const found = this.personnelList.find(p => p._id === emp);
      return found ? `${found.firstName} ${found.lastName}` : emp;
    }
    return `${emp.firstName} ${emp.lastName}`;
  }

  getTypeLabel(type: string): string {
    return this.leaveTypes.find(t => t.value === type)?.label || type;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'En Attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Refusé';
      default: return status;
    }
  }

  openLeaveDialog(): void {
    const dialogRef = this.dialog.open(LeaveFormDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: { personnelList: this.personnelList }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.leaveService.create(result).subscribe({
          next: () => this.loadLeaves(),
          error: (err) => {
            console.error('Erreur de création de congé', err);
            this.loading = false;
            // Optionally could add a toast or alert here
          }
        });
      }
    });
  }

  approve(leave: Leave): void {
    if (!leave._id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      data: {
        title: 'Approuver le congé',
        message: `Approuver la demande de congé de ${this.getPersonnelName(leave.employeeId)} (${leave.totalDays} jours) ?`,
        confirmText: 'Approuver'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.leaveService.updateStatus(leave._id!, 'APPROVED').subscribe(() => this.loadLeaves());
      }
    });
  }

  reject(leave: Leave): void {
    if (!leave._id) return;
    
    const dialogRef = this.dialog.open(LeaveRejectDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: {
        leave: leave,
        employeeName: this.getPersonnelName(leave.employeeId)
      }
    });

    dialogRef.afterClosed().subscribe(rejectionNote => {
      if (rejectionNote !== undefined) {
        this.loading = true;
        this.leaveService.updateStatus(leave._id!, 'REJECTED', rejectionNote).subscribe(() => this.loadLeaves());
      }
    });
  }

  deleteLeave(leave: Leave): void {
    if (!leave._id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      data: {
        title: 'Supprimer la demande',
        message: `Êtes-vous sûr de vouloir supprimer cette demande de congé ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.leaveService.delete(leave._id!).subscribe(() => this.loadLeaves());
      }
    });
  }
}
