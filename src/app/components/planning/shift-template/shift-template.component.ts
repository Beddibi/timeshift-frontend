import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { LucideAngularModule, Plus, Trash2, Clock, Calendar, Edit3 } from 'lucide-angular';
import { PlanningService } from '../../../services/planning.service';
import { ShiftTemplateFormDialogComponent } from './shift-template-form-dialog/shift-template-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-shift-template',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './shift-template.component.html',
  styleUrl: './shift-template.component.scss'
})
export class ShiftTemplateComponent implements OnInit {
  readonly plusIcon = Plus;
  readonly deleteIcon = Trash2;
  readonly clockIcon = Clock;
  readonly calendarIcon = Calendar;
  readonly editIcon = Edit3;

  templates: any[] = [];
  loading = true;

  constructor(
    private planningService: PlanningService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading = true;
    this.planningService.getTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement modèles', err);
        this.loading = false;
      }
    });
  }

  openTemplateDialog(template?: any): void {
    const dialogRef = this.dialog.open(ShiftTemplateFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: { template }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planningService.createTemplate(result).subscribe(() => this.loadTemplates());
      }
    });
  }

  deleteTemplate(template: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer le modèle',
        message: `Voulez-vous vraiment supprimer le modèle "${template.name}" ?`,
        confirmText: 'Supprimer',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planningService.deleteTemplate(template._id).subscribe(() => this.loadTemplates());
      }
    });
  }

  getDayName(dayIndex: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayIndex] || `Jour ${dayIndex}`;
  }
}
