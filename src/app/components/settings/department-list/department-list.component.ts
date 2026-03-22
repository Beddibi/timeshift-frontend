import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LucideAngularModule, Plus, Trash2, Building } from 'lucide-angular';
import { DepartmentService, Department } from '../../../services/department.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss'
})
export class DepartmentListComponent implements OnInit {
  departments: Department[] = [];
  displayedColumns: string[] = ['name', 'status', 'actions'];
  loading = true;

  newDeptName = '';

  readonly plusIcon = Plus;
  readonly deleteIcon = Trash2;
  readonly buildingIcon = Building;

  constructor(
    private departmentService: DepartmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  addDepartment(): void {
    if (!this.newDeptName.trim()) return;
    
    this.departmentService.createDepartment({ name: this.newDeptName.trim(), isActive: true }).subscribe({
      next: () => {
        this.newDeptName = '';
        this.loadDepartments();
      },
      error: (err) => console.error('Failed to create dept', err)
    });
  }

  deleteDepartment(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'dark-mauve-dialog',
      data: {
        title: 'Supprimer ce département',
        message: 'Êtes-vous sûr de vouloir supprimer définitivement ce département ?',
        confirmText: 'Supprimer',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.departmentService.deleteDepartment(id).subscribe(() => {
          this.loadDepartments();
        });
      }
    });
  }
}
