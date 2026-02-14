import { Component, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IkgsHeader } from '../components/ikgs-header/ikgs-header';
import { IkgsSidebar } from '../components/ikgs-sidebar/ikgs-sidebar';
import { IkgsFooter } from '../components/ikgs-footer/ikgs-footer';
import { IkgsNotificationDrawer } from '../components/ikgs-notification-drawer/ikgs-notification-drawer';

@Component({
  selector: 'app-ikgs-main-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, IkgsHeader, IkgsSidebar, IkgsFooter, IkgsNotificationDrawer],
  templateUrl: './ikgs-main-layout.html',
})
export class IkgsMainLayout {
  isSidebarVisible = signal(true);
  isMobileMenuOpen = signal(false);
  isNotificationDrawerOpen = signal(false);

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isMobileMenuOpen.set(false);
    }
  }

  isMobileOnly(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  }

  toggleSidebar() {
    this.isSidebarVisible.set(!this.isSidebarVisible());
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }
}
