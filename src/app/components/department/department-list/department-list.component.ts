import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { LucideAngularModule, Plus, Search, MoreVertical, Edit2, Trash2, Building } from 'lucide-angular';
import { DepartmentService, Department } from '../../../services/department.service';
import { DepartmentFormDialogComponent } from '../department-form-dialog/department-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    LucideAngularModule
  ],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss'
})
export class DepartmentListComponent implements OnInit {
  departments: Department[] = [];
  filteredDepartments: Department[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  error: string | null = null;

  // Icons
  plusIcon = Plus;
  searchIcon = Search;
  moreIcon = MoreVertical;
  editIcon = Edit2;
  deleteIcon = Trash2;
  buildingIcon = Building;

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
        this.filterDepartments();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des départements';
        this.loading = false;
      }
    });
  }

  filterDepartments(): void {
    if (!this.searchQuery.trim()) {
      this.filteredDepartments = [...this.departments];
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredDepartments = this.departments.filter(dept => 
        dept.name.toLowerCase().includes(query) || 
        (dept.description && dept.description.toLowerCase().includes(query))
      );
    }
  }

  openDepartmentDialog(department?: Department): void {
    const dialogRef = this.dialog.open(DepartmentFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: { department }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (department && department._id) {
          this.departmentService.updateDepartment(department._id, result).subscribe({
            next: () => this.loadDepartments(),
            error: (err) => this.handleBackendError(err, result, department)
          });
        } else {
          this.departmentService.createDepartment(result).subscribe({
            next: () => this.loadDepartments(),
            error: (err) => this.handleBackendError(err, result)
          });
        }
      }
    });
  }

  private handleBackendError(err: any, formData: any, originalDepartment?: Department): void {
    let errorMessage = 'Une erreur est survenue.';
    if (err.status === 409) {
      errorMessage = 'Ce département existe déjà !';
    }

    // Re-open dialog with error message to preserve user input
    this.dialog.open(DepartmentFormDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: { 
        department: { ...originalDepartment, ...formData },
        error: errorMessage
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        if (originalDepartment && originalDepartment._id) {
          this.departmentService.updateDepartment(originalDepartment._id, result).subscribe({
            next: () => this.loadDepartments(),
            error: (err2) => this.handleBackendError(err2, result, originalDepartment)
          });
        } else {
           this.departmentService.createDepartment(result).subscribe({
            next: () => this.loadDepartments(),
            error: (err2) => this.handleBackendError(err2, result)
          });
        }
      }
    });
  }

  deleteDepartment(department: Department): void {
    if (!department._id) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      data: {
        title: 'Supprimer le département',
        message: `Êtes-vous sûr de vouloir supprimer le département "${department.name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.departmentService.deleteDepartment(department._id!).subscribe({
          next: () => this.loadDepartments(),
          error: (err) => {
            console.error('Erreur lors de la suppression', err);
            this.error = 'Impossible de supprimer le département. Veuillez réessayer.';
          }
        });
      }
    });
  }

  toggleDepartmentStatus(department: Department): void {
    if (!department._id) return;
    
    const updatedStatus = !department.isActive;
    // Optimistic UI update
    department.isActive = updatedStatus;
    
    this.departmentService.updateDepartment(department._id, { isActive: updatedStatus }).subscribe({
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut', err);
        // Revert on error
        department.isActive = !updatedStatus;
        alert('Impossible de mettre à jour le statut.');
      }
    });
  }
}
