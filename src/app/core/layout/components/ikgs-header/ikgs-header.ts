import { Component, Output, EventEmitter, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { IkgsSearch } from '../ikgs-search/ikgs-search';
import { IkgsNotifications } from '../ikgs-notifications/ikgs-notifications';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, filter } from 'rxjs';

@Component({
  selector: 'app-ikgs-header',
  standalone: true,
  imports: [CommonModule, RouterLink, IkgsSearch, IkgsNotifications],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 relative z-20">
      <div class="flex items-center gap-4">
        <!-- Mobile Hamburger Toggle -->
        <button (click)="mobileMenuToggle.emit()" class="lg:hidden p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all active:scale-95">
          <i class="pi pi-bars text-lg"></i>
        </button>

        <!-- Desktop Sidebar Toggle -->
        <button (click)="sidebarToggle.emit()" class="hidden lg:flex p-2.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 rounded-xl border border-transparent hover:border-slate-100 transition-all active:scale-95 group">
          <i class="pi pi-bars text-lg transition-transform group-hover:scale-110"></i>
        </button>

        <div class="flex items-center gap-3">
          <h2 class="text-sm sm:text-lg font-bold text-slate-900 capitalize truncate">{{ pageTitle() }}</h2>
          <div class="hidden sm:block h-4 w-[1px] bg-slate-200"></div>
          <div class="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap">
            <span>IKGS</span>
            <i class="pi pi-chevron-right text-[8px]"></i>
            <span class="text-slate-900">{{ pageTitle() }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 sm:gap-6">
        <app-ikgs-search />

        <div class="hidden sm:block h-6 w-[1px] bg-slate-200"></div>

        <div class="flex items-center gap-2 sm:gap-4">
          <app-ikgs-notifications [count]="3" (onClick)="notificationClick.emit()" />
          
          <button routerLink="/login" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-200 transition-all active:scale-95">
            <i class="pi pi-sign-out text-base sm:text-lg"></i>
          </button>
        </div>
      </div>
    </header>
  `
})
export class IkgsHeader {
  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() mobileMenuToggle = new EventEmitter<void>();
  @Output() notificationClick = new EventEmitter<void>();
  private router = inject(Router);

  private routeTitle = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => this.getTitleFromUrl(e.urlAfterRedirects || e.url))
    ),
    { initialValue: this.getTitleFromUrl(this.router.url) }
  );

  pageTitle = computed(() => this.routeTitle());

  private getTitleFromUrl(url: string): string {
    const routeTitleMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'style-configuration/new': 'Style Configuration',
      'style-configuration': 'Style Configuration',
      'work-order/new': 'Work Order',
      'work-order': 'Work Order',
      'staff': 'Staff',
      'contractors': 'Contractors',
    };
    for (const [route, title] of Object.entries(routeTitleMap)) {
      if (url.includes(route)) return title;
    }
    return 'Dashboard';
  }
}

