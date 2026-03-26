// Application Router Configuration
import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PersonnelListComponent } from './components/personnel-list/personnel-list.component';
import { DepartmentListComponent } from './components/department/department-list/department-list.component';
import { PlanningComponent } from './components/planning/planning.component';
import { BulkPlanningComponent } from './components/planning/bulk-planning/bulk-planning.component';
import { LoginComponent } from './components/auth/login/login.component';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { CompanySettingsComponent } from './components/settings/company-settings/company-settings.component';
import { ReportComponent } from './components/report/report.component';
import { PersonnelFormComponent } from './components/personnel-form/personnel-form.component';
import { KioskComponent } from './components/kiosk/kiosk.component';
import { DeviceListComponent } from './components/settings/device-list/device-list.component';
import { MobileLayoutComponent } from './components/mobile-punch/mobile-layout/mobile-layout.component';
import { MobileLoginComponent } from './components/mobile-punch/mobile-login/mobile-login.component';
import { MobilePunchComponent } from './components/mobile-punch/mobile-punch/mobile-punch.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'kiosk', component: KioskComponent }, // Standalone route outside layout
  {
    path: 'mobile',
    component: MobileLayoutComponent,
    children: [
      { path: 'login', component: MobileLoginComponent },
      { path: 'punch', component: MobilePunchComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'personnel', component: PersonnelListComponent, canActivate: [permissionGuard], data: { permissions: ['VIEW_PERSONNEL', 'MANAGE_PERSONNEL'] } },
      { path: 'personnel/add', component: PersonnelFormComponent, canActivate: [permissionGuard], data: { permissions: ['MANAGE_PERSONNEL'] } },
      { path: 'personnel/edit/:id', component: PersonnelFormComponent, canActivate: [permissionGuard], data: { permissions: ['MANAGE_PERSONNEL'] } },
      { path: 'departments', component: DepartmentListComponent, canActivate: [permissionGuard], data: { permissions: ['VIEW_DEPARTMENTS', 'MANAGE_DEPARTMENTS'] } },
      { path: 'planning/bulk', component: BulkPlanningComponent, canActivate: [permissionGuard], data: { permissions: ['MANAGE_PLANNING'] } },
      { path: 'planning', component: PlanningComponent, canActivate: [authGuard], data: { permissions: ['VIEW_PLANNING', 'MANAGE_PLANNING'] } },
      { path: 'planning/templates', loadComponent: () => import('./components/planning/shift-template/shift-template.component').then(m => m.ShiftTemplateComponent), canActivate: [authGuard], data: { permissions: ['MANAGE_PLANNING'] } },
      { path: 'planning/session/new', loadComponent: () => import('./components/planning/shift-form/shift-form.component').then(m => m.ShiftFormComponent), canActivate: [permissionGuard], data: { permissions: ['MANAGE_PLANNING'] } },
      { path: 'planning/session/edit/:id', loadComponent: () => import('./components/planning/shift-form/shift-form.component').then(m => m.ShiftFormComponent), canActivate: [permissionGuard], data: { permissions: ['MANAGE_PLANNING'] } },
      { path: 'settings/company', component: CompanySettingsComponent, canActivate: [permissionGuard], data: { permissions: ['MANAGE_SETTINGS'] } },
      { path: 'settings/devices', component: DeviceListComponent, canActivate: [permissionGuard], data: { permissions: ['MANAGE_DEVICES', 'MANAGE_SETTINGS'] } },
      { path: 'settings/users', loadComponent: () => import('./components/settings/user-settings/user-settings.component').then(m => m.UserSettingsComponent), canActivate: [permissionGuard], data: { permissions: ['MANAGE_USERS'] } },
      { path: 'leaves', loadComponent: () => import('./components/leave/leave.component').then(m => m.LeaveComponent), canActivate: [permissionGuard], data: { permissions: ['VIEW_LEAVES', 'MANAGE_LEAVES'] } },
      { path: 'reports', component: ReportComponent, canActivate: [permissionGuard], data: { permissions: ['VIEW_REPORTS'] } },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
