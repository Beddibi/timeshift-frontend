import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LucideAngularModule, Users, LayoutDashboard, Calendar, FileText, Settings, LogOut, MonitorSmartphone, CalendarCheck, Building, Shield, Bell, Search } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    LucideAngularModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  readonly dashboardIcon = LayoutDashboard;
  readonly usersIcon = Users;
  readonly calendarIcon = Calendar;
  readonly reportsIcon = FileText;
  readonly settingsIcon = Settings;
  readonly devicesIcon = MonitorSmartphone;
  readonly leaveIcon = CalendarCheck;
  readonly logoutIcon = LogOut;
  readonly buildingIcon = Building;
  readonly shieldIcon = Shield;
  readonly bellIcon = Bell;
  readonly searchIcon = Search;

  constructor(
    public authService: AuthService,
    public loadingService: LoadingService
  ) {}

  logout(): void {
    this.authService.logout();
  }
}
