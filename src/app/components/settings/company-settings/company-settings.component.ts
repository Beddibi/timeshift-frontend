import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule, Settings, Save, Clock, CalendarDays, Smartphone, MapPin, Plus, Trash2, Info } from 'lucide-angular';
import { SettingsService, CompanySettings, DaySchedule } from '../../../services/settings.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    LucideAngularModule
  ],
  templateUrl: './company-settings.component.html',
  styleUrl: './company-settings.component.scss'
})
export class CompanySettingsComponent implements OnInit {
  settingsForm: FormGroup;
  isLoading = false;

  readonly settingsIcon = Settings;
  readonly saveIcon = Save;
  readonly clockIcon = Clock;
  readonly calendarIcon = CalendarDays;
  readonly smartphoneIcon = Smartphone;
  readonly mapPinIcon = MapPin;
  readonly addIcon = Plus;
  readonly deleteIcon = Trash2;
  readonly infoIcon = Info;

  readonly dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
    this.settingsForm = this.fb.group({
      weeklySchedule: this.fb.array([]),
      latenessGracePeriodMinutes: [15, [Validators.required, Validators.min(0)]],
      isGeolocationMandatoryForMobilePunch: [true],
      allowedLocations: this.fb.array([])
    });
  }

  get weeklySchedule(): FormArray {
    return this.settingsForm.get('weeklySchedule') as FormArray;
  }

  get allowedLocations(): FormArray {
    return this.settingsForm.get('allowedLocations') as FormArray;
  }

  createLocationFormGroup(name = '', lat = 0, lng = 0, radius = 50): FormGroup {
    return this.fb.group({
      name: [name, Validators.required],
      latitude: [lat, Validators.required],
      longitude: [lng, Validators.required],
      radiusMeters: [radius, [Validators.required, Validators.min(10)]]
    });
  }

  addLocation(): void {
    this.allowedLocations.push(this.createLocationFormGroup());
  }

  removeLocation(index: number): void {
    this.allowedLocations.removeAt(index);
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  createDayFormGroup(day: DaySchedule): FormGroup {
    return this.fb.group({
      dayOfWeek: [day.dayOfWeek],
      isActive: [day.isActive],
      morningStart: [day.morningStart, Validators.required],
      morningEnd: [day.morningEnd, Validators.required],
      afternoonStart: [day.afternoonStart, Validators.required],
      afternoonEnd: [day.afternoonEnd, Validators.required]
    });
  }

  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        // Clear existing rules
        while (this.weeklySchedule.length !== 0) {
          this.weeklySchedule.removeAt(0);
        }

        // Add rules from DB, sorted by day (Monday first typically, but relying on backend order)
        const sortedSchedule = [...settings.weeklySchedule].sort((a, b) => {
          // Adjust to make Monday(1) first, Sunday(0) last
          const aIndex = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
          const bIndex = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
          return aIndex - bIndex;
        });

        sortedSchedule.forEach(day => {
          this.weeklySchedule.push(this.createDayFormGroup(day));
        });

        while (this.allowedLocations.length !== 0) {
          this.allowedLocations.removeAt(0);
        }
        
        if (settings.allowedLocations) {
          settings.allowedLocations.forEach(loc => {
            this.allowedLocations.push(this.createLocationFormGroup(loc.name, loc.latitude, loc.longitude, loc.radiusMeters));
          });
        }

        this.settingsForm.patchValue({
          latenessGracePeriodMinutes: settings.latenessGracePeriodMinutes,
          isGeolocationMandatoryForMobilePunch: settings.isGeolocationMandatoryForMobilePunch ?? true
        });
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading settings', err);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.valid) {
      this.isLoading = true;
      this.settingsService.updateSettings(this.settingsForm.value).subscribe({
        next: (updatedSettings) => {
          this.isLoading = false;
          this.snackBar.open('Paramètres enregistrés avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
          });
        },
        error: (err) => {
          console.error('Error updating settings', err);
          this.isLoading = false;
          this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }
}
