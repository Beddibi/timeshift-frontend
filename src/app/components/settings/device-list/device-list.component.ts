import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, MonitorSmartphone, Server, Search, Edit3, Trash2, Link, Copy, X, Plus } from 'lucide-angular';
import { DeviceService } from '../../../services/device.service';
import { Device } from '../../../models/device.model';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSelectModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    LucideAngularModule
  ],
  templateUrl: './device-list.component.html',
  styleUrl: './device-list.component.scss'
})
export class DeviceListComponent implements OnInit {
  devices: Device[] = [];
  deviceForm: FormGroup;
  showForm: boolean = false;
  editingId: string | null = null;
  loading: boolean = true;

  readonly searchIcon = Search;
  readonly editIcon = Edit3;
  readonly deleteIcon = Trash2;
  readonly serverIcon = Server;
  readonly phoneIcon = MonitorSmartphone;
  readonly linkIcon = Link;
  readonly copyIcon = Copy;
  readonly closeIcon = X;
  readonly plusIcon = Plus;

  displayedColumns: string[] = ['name', 'type', 'location', 'status', 'token', 'actions'];

  constructor(
    private deviceService: DeviceService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.deviceForm = this.fb.group({
      name: ['', Validators.required],
      type: ['WEB_KIOSK', Validators.required],
      location: [''],
      ipAddress: ['']
    });
  }

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading = true;
    this.deviceService.getDevices().subscribe({
      next: (data) => {
        this.devices = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openAddForm(): void {
    this.deviceForm.reset({ type: 'WEB_KIOSK' });
    this.editingId = null;
    this.showForm = true;
  }

  openEditForm(device: Device): void {
    if(!device._id) return;
    this.editingId = device._id;
    this.deviceForm.patchValue(device);
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  saveDevice(): void {
    if (this.deviceForm.invalid) return;

    if (this.editingId) {
      this.deviceService.updateDevice(this.editingId, this.deviceForm.value).subscribe(() => {
        this.loadDevices();
        this.closeForm();
      });
    } else {
      this.deviceService.createDevice(this.deviceForm.value).subscribe(() => {
        this.loadDevices();
        this.closeForm();
      });
    }
  }

  deleteDevice(id: string | undefined): void {
    if(!id) return;
    if (confirm("Êtes-vous sûr de vouloir supprimer cette pointeuse ?")) {
      this.deviceService.deleteDevice(id).subscribe(() => this.loadDevices());
    }
  }

  toggleStatus(device: Device): void {
    if (!device._id) return;
    this.deviceService.updateDevice(device._id, { isActive: !device.isActive }).subscribe(() => {
      this.loadDevices();
    });
  }

  getKioskLink(token: string): string {
    const origin = window.location.origin;
    return `${origin}/kiosk?token=${token}`;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Lien Kiosque copié dans le presse-papier !', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['premium-snackbar']
      });
    });
  }
}
