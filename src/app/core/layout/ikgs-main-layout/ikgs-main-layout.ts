import { Component, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ikgs-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './ikgs-main-layout.html',
})
export class IkgsMainLayout {
  isSidebarVisible = signal(true);
  isMobileMenuOpen = signal(false);
  expandedMenus = signal<Record<string, boolean>>({});

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

  toggleSubmenu(menuId: string) {
    const current = this.expandedMenus();
    this.expandedMenus.set({
      ...current,
      [menuId]: !current[menuId]
    });
  }

  isMenuExpanded(menuId: string): boolean {
    return !!this.expandedMenus()[menuId];
  }
}
