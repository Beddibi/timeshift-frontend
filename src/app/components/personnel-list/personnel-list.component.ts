import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Edit3, Trash2, Mail, Briefcase, Power, CheckCircle, XCircle } from 'lucide-angular';
import { PersonnelService } from '../../services/personnel.service';
import { Personnel } from '../../models/personnel.model';
import { PersonnelFormComponent } from '../personnel-form/personnel-form.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-personnel-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatInputModule, 
    MatFormFieldModule,
    MatChipsModule,
    MatDialogModule,
    MatSelectModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './personnel-list.component.html',
  styleUrl: './personnel-list.component.scss'
})
export class PersonnelListComponent implements OnInit {
  readonly plusIcon = Plus;
  readonly searchIcon = Search;
  readonly editIcon = Edit3;
  readonly deleteIcon = Trash2;
  readonly mailIcon = Mail;
  readonly suitcaseIcon = Briefcase;
  readonly powerIcon = Power;
  readonly checkIcon = CheckCircle;
  readonly xIcon = XCircle;

  displayedColumns: string[] = ['matricule', 'name', 'position', 'department', 'status', 'actions'];
  dataSource: Personnel[] = [];
  filteredDataSource: Personnel[] = [];
  loading = true;
  
  statusFilter: string = 'ALL';
  searchQuery: string = '';

  constructor(
    private personnelService: PersonnelService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPersonnel();
  }

  loadPersonnel(): void {
    this.loading = true;
    this.personnelService.getPersonnel().subscribe({
      next: (data) => {
        this.dataSource = data;
        this.filteredDataSource = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching personnel', err);
        this.loading = false;
      }
    });
  }

  deletePersonnel(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'dark-mauve-dialog',
      data: {
        title: 'Supprimer le personnel',
        message: 'Êtes-vous sûr de vouloir supprimer définitivement cet employé ? Cette action est irréversible.',
        confirmText: 'Supprimer',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.personnelService.deletePersonnel(id).subscribe(() => {
          this.loadPersonnel();
        });
      }
    });
  }

  toggleActive(personnel: Personnel): void {
    const updatedStatus = !personnel.isActive;
    if (personnel._id) {
      this.personnelService.updatePersonnel(personnel._id, { isActive: updatedStatus }).subscribe({
        next: () => {
          personnel.isActive = updatedStatus;
          this.applyFilters();
        },
        error: (err) => console.error('Error toggling status', err)
      });
    }
  }

  openAddPersonnelDialog(): void {
    this.router.navigate(['/personnel/add']);
  }

  editPersonnel(personnel: Personnel): void {
    if (personnel._id) {
      this.router.navigate(['/personnel/edit', personnel._id]);
    }
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDataSource = this.dataSource.filter(p => {
      // 1. Check text search
      const matchesSearch = !this.searchQuery ? true : (
        p.matricule?.toLowerCase().includes(this.searchQuery) ||
        p.firstName.toLowerCase().includes(this.searchQuery) ||
        p.lastName.toLowerCase().includes(this.searchQuery) ||
        p.position.toLowerCase().includes(this.searchQuery) ||
        p.department.toLowerCase().includes(this.searchQuery)
      );

      // 2. Check status filter
      let matchesStatus = true;
      if (this.statusFilter === 'ACTIVE') {
        matchesStatus = p.isActive === true;
      } else if (this.statusFilter === 'INACTIVE') {
        matchesStatus = p.isActive === false;
      }

      return matchesSearch && matchesStatus;
    });
  }
}
