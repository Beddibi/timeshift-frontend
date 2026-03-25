import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule, ArrowLeft, User, Briefcase, Fingerprint, KeyRound, Smartphone } from 'lucide-angular';
import { PersonnelService } from '../../services/personnel.service';
import { DepartmentService, Department } from '../../services/department.service';
import { Personnel } from '../../models/personnel.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-personnel-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    LucideAngularModule
  ],
  templateUrl: './personnel-form.component.html',
  styleUrl: './personnel-form.component.scss'
})
export class PersonnelFormComponent implements OnInit {
  personnelForm: FormGroup;
  readonly arrowLeftIcon = ArrowLeft;
  readonly userIcon = User;
  readonly briefcaseIcon = Briefcase;
  readonly fingerprintIcon = Fingerprint;
  readonly keyIcon = KeyRound;
  readonly smartphoneIcon = Smartphone;

  departments: Department[] = [];
  isEditMode = false;
  currentId: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private personnelService: PersonnelService,
    private departmentService: DepartmentService
  ) {
    this.personnelForm = this.fb.group({
      matricule: [this.generateDefaultMatricule(), Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      position: ['', Validators.required],
      department: ['', Validators.required],
      rfidTag: [''],
      cardNumber: [''],
      nfcTag: [''],
      faceId: [''],
      fingerprintId: [''],
      pinCode: ['', [Validators.pattern('^[0-9]{4}$')]],
      defaultClockInMethod: ['MANUAL']
    });
  }

  generateDefaultMatricule(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${randomNum}`;
  }

  ngOnInit(): void {
    // 1. Fetch departments
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
        if (data.length === 0) {
          this.seedDefaultDepartments();
        }
      },
      error: (err) => console.error('Failed to load departments', err)
    });

    // 2. Check route for edit mode
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentId = id;
        this.loadPersonnelData(id);
      }
    });
  }

  loadPersonnelData(id: string): void {
    this.loading = true;
    this.personnelService.getPersonnel().subscribe(list => {
      const personnel = list.find(p => p._id === id);
      if (personnel) {
        this.personnelForm.patchValue(personnel);
      }
      this.loading = false;
    });
  }

  seedDefaultDepartments(): void {
    const defaults = ['Direction', 'Ressources Humaines', 'IT', 'Finance', 'Ventes', 'Marketing', 'Opérations'];
    defaults.forEach(dept => {
      this.departmentService.createDepartment({ name: dept, isActive: true }).subscribe();
    });
    // Let it run in background, then we just map them temporarily for the UI
    this.departments = defaults.map(d => ({ name: d, isActive: true }));
  }

  onSubmit(): void {
    if (this.personnelForm.valid) {
      this.loading = true;
      if (this.isEditMode && this.currentId) {
        // Editing mode
        this.personnelService.updatePersonnel(this.currentId, this.personnelForm.value).subscribe({
          next: () => this.router.navigate(['/personnel']),
          error: (error) => {
            console.error('Error updating personnel:', error);
            this.loading = false;
          }
        });
      } else {
        // Creation mode
        const newPersonnel = {
          ...this.personnelForm.value,
          isActive: true
        };
        
        this.personnelService.createPersonnel(newPersonnel).subscribe({
          next: () => this.router.navigate(['/personnel']),
          error: (error) => {
            console.error('Error creating personnel:', error);
            this.loading = false;
          }
        });
      }
    }
  }

  onCancel(): void {
    this.router.navigate(['/personnel']);
  }
}
