import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { LucideAngularModule, Calendar, Users, Settings, Workflow, CheckCircle, ArrowLeft } from 'lucide-angular';
import { Router } from '@angular/router';
import { PersonnelService } from '../../../services/personnel.service';
import { PlanningService, Shift } from '../../../services/planning.service';
import { SettingsService, CompanySettings } from '../../../services/settings.service';
import { Personnel } from '../../../models/personnel.model';

@Component({
  selector: 'app-bulk-planning',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDividerModule,
    LucideAngularModule
  ],
  templateUrl: './bulk-planning.component.html',
  styleUrl: './bulk-planning.component.scss'
})
export class BulkPlanningComponent implements OnInit {
  bulkForm: FormGroup;
  personnelList: Personnel[] = [];
  companySettings: CompanySettings | null = null;
  isLoading = false;

  readonly calendarIcon = Calendar;
  readonly usersIcon = Users;
  readonly settingsIcon = Settings;
  readonly workflowIcon = Workflow;
  readonly checkIcon = CheckCircle;
  readonly backIcon = ArrowLeft;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private personnelService: PersonnelService,
    private planningService: PlanningService,
    private settingsService: SettingsService
  ) {
    this.bulkForm = this.fb.group({
      period: ['CURRENT_WEEK', Validators.required],
      personnelIds: [['ALL'], Validators.required]
    });
  }

  ngOnInit(): void {
    this.personnelService.getPersonnel().subscribe(data => this.personnelList = data);
    this.settingsService.getSettings().subscribe(settings => this.companySettings = settings);
  }

  goBack(): void {
    this.router.navigate(['/planning']);
  }

  onSubmit(): void {
    if (this.bulkForm.invalid || !this.companySettings) return;

    this.isLoading = true;
    const { period, personnelIds } = this.bulkForm.value;

    let targetPersonnel = this.personnelList;
    if (!personnelIds.includes('ALL')) {
      targetPersonnel = this.personnelList.filter(p => personnelIds.includes(p._id));
    }

    const { startDate, endDate } = this.getDatesFromPeriod(period);
    
    // Generate shifts
    const newShifts: Partial<Shift>[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const daySettings = this.companySettings.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);

      if (daySettings && daySettings.isActive) {
        targetPersonnel.forEach(p => {
          newShifts.push({
            personnelId: p._id,
            date: currentDate.toISOString().split('T')[0],
            startTime: daySettings.morningStart || '09:00',
            endTime: daySettings.afternoonEnd || '17:00',
            type: 'NORMAL',
            period: 'FULL_DAY',
            notes: 'Généré automatiquement (Bulk)'
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (newShifts.length > 0) {
      this.planningService.createBulk(newShifts).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/planning']);
        },
        error: (err) => {
          console.error('Error generating bulk schedule', err);
          this.isLoading = false;
        }
      });
    } else {
      alert("Aucun jour ouvrable trouvé dans la période sélectionnée ou aucun employé choisi.");
      this.isLoading = false;
    }
  }

  private getDatesFromPeriod(period: string): { startDate: Date, endDate: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (period === 'CURRENT_WEEK') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
      startDate = new Date(today.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } 
    else if (period === 'NEXT_WEEK') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) + 7;
      startDate = new Date(today.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    else if (period === 'CURRENT_MONTH') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    else if (period === 'NEXT_MONTH') {
      startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    }

    return { startDate, endDate };
  }
}
