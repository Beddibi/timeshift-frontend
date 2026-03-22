import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule, LogIn, Delete, Clock, User, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-mobile-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatProgressSpinnerModule,
    LucideAngularModule
  ],
  templateUrl: './mobile-login.component.html',
  styleUrl: './mobile-login.component.scss'
})
export class MobileLoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  readonly loginIcon = LogIn;
  readonly deleteIcon = Delete;
  readonly clockIcon = Clock;
  readonly userIcon = User;
  readonly alertIcon = AlertCircle;
  
  pinCodeDisplay = ''; // Visual representation of PIN

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      matricule: ['', [Validators.required]],
      pinCode: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]]
    });
  }

  onNumpadClick(digit: number): void {
    if (this.pinCodeDisplay.length < 4) {
      this.pinCodeDisplay += digit;
      this.loginForm.patchValue({ pinCode: this.pinCodeDisplay });
      
      if (this.pinCodeDisplay.length === 4 && this.loginForm.get('matricule')?.valid) {
        this.onSubmit();
      }
    }
  }

  onNumpadDelete(): void {
    if (this.pinCodeDisplay.length > 0) {
      this.pinCodeDisplay = this.pinCodeDisplay.slice(0, -1);
      this.loginForm.patchValue({ pinCode: this.pinCodeDisplay });
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      this.authService.mobileLogin(this.loginForm.value).subscribe({
        next: () => {
          this.router.navigate(['/mobile/punch']);
        },
        error: (err) => {
          this.loading = false;
          this.pinCodeDisplay = '';
          this.loginForm.patchValue({ pinCode: '' });
          this.errorMessage = err.error?.message || 'Identifiants incorrects';
        }
      });
    } else {
      this.errorMessage = 'Veuillez saisir votre Matricule et votre Code PIN à 4 chiffres.';
    }
  }
}
