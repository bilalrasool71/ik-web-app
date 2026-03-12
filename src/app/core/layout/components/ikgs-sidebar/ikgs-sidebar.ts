import { Component, Input, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-ikgs-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="fixed inset-y-0 left-0 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out shadow-xl lg:shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-50 h-full w-72"
      [class.-translate-x-full]="isMobileOnly ? !isMobileOpen : !isVisible"
      [class.translate-x-0]="isMobileOnly ? isMobileOpen : isVisible"
    >
      <!-- Sidebar Header (Logo) -->
      <div class="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-2 text-white shadow-lg shadow-indigo-200 shrink-0 overflow-hidden"
          >
            <img src="logo.png" alt="Logo IKGS" class="w-full h-full object-contain" />
          </div>
          <span class="font-bold text-slate-900 text-lg tracking-tight whitespace-nowrap">
            IK <span class="text-red-600">GS</span>
          </span>
        </div>
        <!-- Mobile Close Button -->
        <button
          (click)="closeMobileMenu.emit()"
          class="ml-auto p-2 lg:hidden text-slate-400 hover:text-slate-900"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Sidebar Content (Nav) -->
      <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-hide">
        <div class="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">
          Main Menu
        </div>

        <!-- Single Item -->
        <a
          routerLink="/ikgs/dashboard"
          (click)="closeMobileMenu.emit()"
          routerLinkActive="bg-indigo-50 text-indigo-600 !border-indigo-600 shadow-sm shadow-indigo-100/50"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
        >
          <i class="pi pi-home text-lg group-hover:scale-110 transition-transform shrink-0"></i>
          <span class="font-semibold text-sm whitespace-nowrap">Dashboard</span>
        </a>

        <a
          routerLink="/ikgs/style-configuration"
          (click)="closeMobileMenu.emit()"
          routerLinkActive="bg-indigo-50 text-indigo-600 !border-indigo-600 shadow-sm shadow-indigo-100/50"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
        >
          <i class="pi pi-palette text-lg group-hover:scale-110 transition-transform shrink-0"></i>
          <span class="font-semibold text-sm whitespace-nowrap">Style Configuration</span>
        </a>

        <a
          routerLink="/ikgs/work-order"
          (click)="closeMobileMenu.emit()"
          routerLinkActive="bg-indigo-50 text-indigo-600 !border-indigo-600 shadow-sm shadow-indigo-100/50"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
        >
          <i class="pi pi-file text-lg group-hover:scale-110 transition-transform shrink-0"></i>
          <span class="font-semibold text-sm whitespace-nowrap">Work Order</span>
        </a>
        <a
          routerLink="/ikgs/contract"
          (click)="closeMobileMenu.emit()"
          routerLinkActive="bg-indigo-50 text-indigo-600 !border-indigo-600 shadow-sm shadow-indigo-100/50"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
        >
          <i class="pi pi-pencil text-lg group-hover:scale-110 transition-transform shrink-0"></i>
          <span class="font-semibold text-sm whitespace-nowrap">Contract</span>
        </a>

        <!-- Nested Item: Users -->
        <div class="space-y-1">
          <button
            (click)="toggleSubmenu('users')"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
          >
            <i class="pi pi-users text-lg group-hover:scale-110 transition-transform shrink-0"></i>
            <span class="font-semibold text-sm whitespace-nowrap flex-1 text-left">Users</span>
            <i
              class="pi pi-chevron-down text-[10px] transition-transform duration-300 shrink-0"
              [class.rotate-180]="isMenuExpanded('users')"
            ></i>
          </button>

          @if (isMenuExpanded('users')) {
            <div
              class="pl-11 space-y-1 overflow-hidden animate-in slide-in-from-top-2 duration-300"
            >
              <a
                class="block px-3 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >All Users</a
              >
              <a
                class="block px-3 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >Roles & Permissions</a
              >
            </div>
          }
        </div>

        <!-- Nested Item: Analytics -->
        <div class="space-y-1">
          <button
            (click)="toggleSubmenu('analytics')"
            class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group"
          >
            <i
              class="pi pi-chart-line text-lg group-hover:scale-110 transition-transform shrink-0"
            ></i>
            <span class="font-semibold text-sm whitespace-nowrap flex-1 text-left">Analytics</span>
            <i
              class="pi pi-chevron-down text-[10px] transition-transform duration-300 shrink-0"
              [class.rotate-180]="isMenuExpanded('analytics')"
            ></i>
          </button>

          @if (isMenuExpanded('analytics')) {
            <div
              class="pl-11 space-y-1 overflow-hidden animate-in slide-in-from-top-2 duration-300"
            >
              <a
                class="block px-3 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >Sales Report</a
              >
              <a
                class="block px-3 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >Traffic Overview</a
              >
            </div>
          }
        </div>

        <div
          class="pt-6 px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3"
        >
          Settings
        </div>

        <a
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent transition-all group cursor-not-allowed opacity-60"
        >
          <i class="pi pi-cog text-lg group-hover:scale-110 transition-transform shrink-0"></i>
          <span class="font-semibold text-sm whitespace-nowrap">Settings</span>
        </a>
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-slate-100 shrink-0">
        <div class="bg-indigo-50 rounded-2xl p-3 flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200"
          >
            <i class="pi pi-user text-lg"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-bold text-slate-900 truncate">Bilal Rasool</p>
            <p class="text-[9px] font-medium text-slate-500 truncate">Admin Account</p>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class IkgsSidebar {
  @Input() isVisible = true;
  @Input() isMobileOpen = false;
  @Input() isMobileOnly = false;
  @Output() closeMobileMenu = new EventEmitter<void>();

  expandedMenus: Record<string, boolean> = {};

  toggleSubmenu(menuId: string) {
    this.expandedMenus[menuId] = !this.expandedMenus[menuId];
  }

  isMenuExpanded(menuId: string): boolean {
    return !!this.expandedMenus[menuId];
  }
}
