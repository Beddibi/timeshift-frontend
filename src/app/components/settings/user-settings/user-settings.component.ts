import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule, Plus, Users, Shield, Edit2, Trash2, CheckCircle2 } from 'lucide-angular';
import { UsersService, AdminUser } from '../../../services/users.service';
import { UserFormDialogComponent } from './user-form-dialog/user-form-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDialogModule, 
    LucideAngularModule
  ],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.scss'
})
export class UserSettingsComponent implements OnInit {
  readonly plusIcon = Plus;
  readonly usersIcon = Users;
  readonly shieldIcon = Shield;
  readonly editIcon = Edit2;
  readonly deleteIcon = Trash2;
  readonly checkIcon = CheckCircle2;

  users: AdminUser[] = [];
  isLoading = false;

  constructor(
    private usersService: UsersService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
        this.isLoading = false;
      }
    });
  }

  openUserForm(user?: AdminUser) {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      panelClass: 'dark-mauve-dialog',
      disableClose: true,
      data: { user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  deleteUser(user: AdminUser) {
    if (user.permissions?.includes('*')) {
      alert("Il n'est pas possible de supprimer le Super Administrateur racine.");
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      panelClass: 'dark-mauve-dialog',
      disableClose: true,
      data: {
        title: 'Supprimer l\'utilisateur',
        message: `Voulez-vous vraiment révoquer les accès de ${user.firstName || user.username} ?`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && user._id) {
        this.usersService.deleteUser(user._id).subscribe({
          next: () => this.loadUsers(),
          error: (err) => console.error('Erreur lors de la suppression', err)
        });
      }
    });
  }
}
