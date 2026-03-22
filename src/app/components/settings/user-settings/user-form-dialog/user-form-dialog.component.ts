import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, X, ShieldAlert } from 'lucide-angular';
import { UsersService, AdminUser } from '../../../../services/users.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatCheckboxModule,
    LucideAngularModule
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss'
})
export class UserFormDialogComponent implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  isSubmitting = false;
  readonly closeIcon = X;
  readonly alertIcon = ShieldAlert;

  availablePermissions = [
    { id: 'VIEW_PERSONNEL', label: 'Voir le Personnel', module: 'Personnel' },
    { id: 'MANAGE_PERSONNEL', label: 'Gérer le Personnel (Modifs)', module: 'Personnel' },
    { id: 'VIEW_DEPARTMENTS', label: 'Voir les Départements', module: 'Départements' },
    { id: 'MANAGE_DEPARTMENTS', label: 'Gérer les Départements', module: 'Départements' },
    { id: 'VIEW_PLANNING', label: 'Voir le Planning', module: 'Planning' },
    { id: 'MANAGE_PLANNING', label: 'Modifier le Planning', module: 'Planning' },
    { id: 'VIEW_LEAVES', label: 'Voir les Congés', module: 'Congés' },
    { id: 'MANAGE_LEAVES', label: 'Valider/Modifier les Congés', module: 'Congés' },
    { id: 'VIEW_REPORTS', label: 'Générer & Voir Rapports', module: 'Rapports' },
    { id: 'MANAGE_DEVICES', label: 'Pointeuses / Kiosque', module: 'Système' },
    { id: 'MANAGE_SETTINGS', label: 'Paramètres Généraux', module: 'Système' },
    { id: 'MANAGE_USERS', label: 'Contrôle des Accès (Admins)', module: 'Système' },
  ];

  permissionGroups: { module: string, perms: any[] }[] = [];

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    public dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: AdminUser }
  ) {
    this.isEditMode = !!data?.user;
    
    // Group permissions by module
    const groups = new Set(this.availablePermissions.map(p => p.module));
    groups.forEach(mod => {
      this.permissionGroups.push({
        module: mod,
        perms: this.availablePermissions.filter(p => p.module === mod)
      });
    });

    const existingPerms = this.isEditMode ? (data.user?.permissions || []) : [];

    this.userForm = this.fb.group({
      firstName: [data?.user?.firstName || '', Validators.required],
      lastName: [data?.user?.lastName || '', Validators.required],
      username: [data?.user?.username || '', [Validators.required, Validators.minLength(4)]],
      passwordPlain: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      // Dynamic Checkbox array
      permissions: this.fb.group({})
    });

    const permsGroup = this.userForm.get('permissions') as FormGroup;
    this.availablePermissions.forEach(perm => {
      const isChecked = existingPerms.includes('*') || existingPerms.includes(perm.id);
      permsGroup.addControl(perm.id, new FormControl({
         value: isChecked, 
         disabled: existingPerms.includes('*') // Disabled if superadmin to prevent accidental removal
      }));
    });
  }

  ngOnInit(): void {}

  onSubmit() {
    if (this.userForm.invalid) return;

    this.isSubmitting = true;
    const formVal = this.userForm.getRawValue(); // raw to get disabled superadmin values

    // Reconstruct permissions array from truthy booleans
    const selectedPerms = Object.keys(formVal.permissions)
      .filter(key => formVal.permissions[key]);
      
    // If user was SuperAdmin, keep '*' 
    let finalPermissions = selectedPerms;
    if (this.isEditMode && this.data.user?.permissions?.includes('*')) {
      finalPermissions = ['*'];
    }

    const payload = {
      username: formVal.username,
      firstName: formVal.firstName,
      lastName: formVal.lastName,
      permissions: finalPermissions,
      ...(formVal.passwordPlain ? { passwordPlain: formVal.passwordPlain } : {})
    };

    if (this.isEditMode && this.data.user?._id) {
      this.usersService.updateUser(this.data.user._id, payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.dialogRef.close(res);
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
          alert("Erreur lors de la modification de l'utilisateur (peut-être un doublon de nom d'utilisateur ?)");
        }
      });
    } else {
      this.usersService.createUser(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.dialogRef.close(res);
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting = false;
          alert("Erreur lors de la création de l'utilisateur (peut-être un nom d'utilisateur déjà pris ?)");
        }
      });
    }
  }
}
