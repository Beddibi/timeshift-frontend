import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAngularModule, LogOut, MapPin, CheckCircle2, Clock } from 'lucide-angular';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-punch',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    LucideAngularModule
  ],
  templateUrl: './mobile-punch.component.html',
  styleUrl: './mobile-punch.component.scss'
})
export class MobilePunchComponent implements OnInit, OnDestroy {
  readonly logoutIcon = LogOut;
  readonly mapPinIcon = MapPin;
  readonly checkIcon = CheckCircle2;
  readonly clockIcon = Clock;

  currentTime: Date = new Date();
  private timeSubscription?: Subscription;

  user: any;
  loading = false;
  punchStatus: 'idle' | 'success' | 'error' = 'idle';
  punchMessage = '';
  lastPunchType = '';

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated() || !this.authService.getUserRole().includes('EMPLOYEE')) {
      this.router.navigate(['/mobile/login']);
      return;
    }

    this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });

    // Start real-time clock
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/mobile/login']);
  }

  async punch(): Promise<void> {
    this.loading = true;
    this.punchStatus = 'idle';
    this.punchMessage = '';

    try {
      const position = await this.getCurrentPosition();
      
      const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        deviceInfo: navigator.userAgent
      };

      this.attendanceService.mobilePunch(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.punchStatus = 'success';
          this.punchMessage = res.message || 'Pointage enregistré.';
          this.lastPunchType = res.attendance?.type || 'OK';
          
          this.playFeedback('success');

          // Reset status after 5 seconds to allow another punch if needed
          setTimeout(() => {
            this.punchStatus = 'idle';
          }, 5000);
        },
        error: (err) => {
          this.loading = false;
          this.punchStatus = 'error';
          this.punchMessage = err.error?.message || 'Erreur lors du pointage.';
          
          this.playFeedback('error');
          
          setTimeout(() => {
            this.punchStatus = 'idle';
          }, 5000);
        }
      });

    } catch (error: any) {
      this.loading = false;
      this.punchStatus = 'error';
      this.punchMessage = error.message || 'Impossible d\'obtenir la géolocalisation.';
      
      this.playFeedback('error');
      
      setTimeout(() => {
        this.punchStatus = 'idle';
      }, 5000);
    }
  }

  private playFeedback(type: 'success' | 'error') {
    // 1. Web Audio API Beep
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'success') {
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch for success
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.15); // Short beep 150ms
        } else {
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low pitch warning buzz
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.4); // Longer buzz 400ms
        }
      }
    } catch (e) {
      console.warn('Audio feedback not supported', e);
    }

    // 2. Vibration API (Haptic Feedback)
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(100); // 100ms short vibration
      } else {
        navigator.vibrate([50, 100, 50, 100, 50]); // SOS-style quick vibration pattern
      }
    }
  }

  private getCurrentPosition(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La géolocalisation n'est pas supportée par votre navigateur."));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, (error) => {
          let msg = "Erreur de géolocalisation.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = "Veuillez autoriser la géolocalisation dans les réglages du téléphone pour pouvoir pointer.";
              break;
            case error.POSITION_UNAVAILABLE:
              msg = "Position indisponible. Vérifiez que votre GPS est bien activé.";
              break;
            case error.TIMEOUT:
              msg = "Le délai d'attente pour obtenir votre position a expiré. Réessayez.";
              break;
          }
          reject(new Error(msg));
        }, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000 // Accept a cached position from up to 1 minute ago
        });
      }
    });
  }
}
