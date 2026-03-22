import { Component, OnInit, OnDestroy, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { DeviceService } from '../../services/device.service';
import { Device } from '../../models/device.model';
import { LucideAngularModule, Clock, ScanFace, FileSignature, CheckCircle2, ChevronLeft, Camera, X } from 'lucide-angular';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ZXingScannerModule],
  templateUrl: './kiosk.component.html',
  styleUrl: './kiosk.component.scss'
})
export class KioskComponent implements OnInit, OnDestroy {
  currentTime: Date = new Date();
  timeSubscription: any;
  deviceInfo: Device | null = null;
  loading: boolean = true;
  error: string | null = null;
  successMessage: string | null = null;

  kioskForm: FormGroup;

  readonly clockIcon = Clock;
  readonly faceIcon = ScanFace;
  readonly pinIcon = FileSignature;
  readonly checkIcon = CheckCircle2;
  readonly backIcon = ChevronLeft;
  readonly cameraIcon = Camera;
  readonly closeIcon = X;

  // Scanner State
  showScanner: boolean = false;
  hasDevices: boolean = false;
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | undefined;

  // Admin Exit State
  showAdminExit: boolean = false;
  adminExitPin: string = '';
  adminExitError: boolean = false;
  
  allowedFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13
  ];

  constructor(
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.kioskForm = this.fb.group({
      matricule: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.error = "Token de kiosque manquant. Impossible d'initialiser le terminal.";
      this.loading = false;
      return;
    }

    // Verify token with backend
    this.deviceService.verifyKioskToken(token).subscribe({
      next: (device: Device) => {
        this.deviceInfo = device;
        this.loading = false;
        this.startClock();
      },
      error: () => {
        this.error = "Token Kiosque Invalide ou Pointeuse Désactivée.";
        this.loading = false;
      }
    });

    // Auto-focus logic can be added here
  }

  startClock() {
    this.timeSubscription = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) clearInterval(this.timeSubscription);
  }

  // Camera Scanner Handlers
  toggleScanner() {
    this.showScanner = !this.showScanner;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
    // Prefer back camera if available
    const backCamera = devices.find(d => /back|rear|environnement/i.test(d.label));
    this.currentDevice = backCamera || devices[0];
  }

  onScanSuccess(result: string) {
    // Treat the scanned QR/Barcode string as the matricule
    const cleanResult = result ? result.trim() : '';
    // Prevent multiple rapid scans of the same code
    if (this.kioskForm.get('matricule')?.value === cleanResult) return;
    
    this.kioskForm.patchValue({ matricule: cleanResult });
    this.showScanner = false;
    
    // Automatically submit if valid
    setTimeout(() => {
      this.clockAction('QR_SCAN');
    }, 500);
  }

  // Handle Barcode scanner / RFID reader entering Matricule automatically
  appendKey(key: string) {
    const currentValue = this.kioskForm.get('matricule')?.value || '';
    if (currentValue.length < 12) {
      this.kioskForm.patchValue({ matricule: currentValue + key });
    }
  }

  onNumpadClick(digit: number): void {
    this.appendKey(digit.toString());
  }

  backspace() {
    const currentValue = this.kioskForm.get('matricule')?.value || '';
    if (currentValue.length > 0) {
      this.kioskForm.patchValue({ matricule: currentValue.slice(0, -1) });
    }
  }

  clear() {
    this.kioskForm.reset();
  }

  clockAction(forcedMethod?: string) {
    if (this.kioskForm.invalid || !this.deviceInfo?._id) return;

    const matricule = this.kioskForm.get('matricule')?.value;
    const punchMethod = forcedMethod || 'PIN'; // Default PIN, could be QR_SCAN
    
    this.attendanceService.clockIn({
      identifier: matricule,
      method: punchMethod === 'QR_SCAN' ? 'APP' : 'PIN', // Mapping to schema enums
      deviceId: this.deviceInfo._id
    }).subscribe({
      next: (response: any) => {
        this.successMessage = response.message;
        this.kioskForm.reset();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.message || "Erreur lors du pointage";
        setTimeout(() => {
          this.error = null;
          this.kioskForm.reset();
        }, 3000);
      }
    });
  }

  // Allow hardware keyboard listeners for quick barcode scans
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.loading || this.error || this.successMessage) return;

    if (this.showAdminExit) {
      if (event.key === 'Escape') this.closeAdminExit();
      else if (event.key === 'Backspace') this.onAdminNumpadDelete();
      else if (/^[0-9]$/.test(event.key)) this.onAdminNumpadClick(parseInt(event.key, 10));
      return;
    }

    // If the user is actively typing in the input, let native HTML handle it to avoid duplicate characters
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.clockAction();
      }
      return;
    }

    if (event.key === 'Enter') {
      this.clockAction();
    } else if (event.key === 'Backspace') {
      this.backspace();
    } else if (/^[a-zA-Z0-9-]$/.test(event.key)) {
      this.appendKey(event.key.toUpperCase());
    }
  }

  openAdminExit() {
    this.showAdminExit = true;
    this.adminExitPin = '';
    this.adminExitError = false;
  }

  closeAdminExit() {
    this.showAdminExit = false;
    this.adminExitPin = '';
    this.adminExitError = false;
  }

  onAdminNumpadClick(digit: number): void {
    if (this.adminExitPin.length < 4) {
      this.adminExitPin += digit;
      this.adminExitError = false;
      
      if (this.adminExitPin.length === 4) {
        if (this.adminExitPin === '0000') {
          this.router.navigate(['/dashboard']);
        } else {
          this.adminExitError = true;
          // Reset pin after brief delay to allow user to see the 4th digit
          setTimeout(() => {
            this.adminExitPin = '';
          }, 400);
        }
      }
    }
  }

  onAdminNumpadDelete(): void {
    if (this.adminExitPin.length > 0) {
      this.adminExitPin = this.adminExitPin.slice(0, -1);
      this.adminExitError = false;
    }
  }
}
