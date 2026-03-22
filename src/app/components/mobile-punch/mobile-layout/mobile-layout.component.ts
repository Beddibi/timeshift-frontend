import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mobile-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mobile-layout.component.html',
  styleUrl: './mobile-layout.component.scss'
})
export class MobileLayoutComponent {
}
