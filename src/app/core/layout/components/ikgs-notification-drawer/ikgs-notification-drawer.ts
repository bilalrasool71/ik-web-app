import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-ikgs-notification-drawer',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Backdrop -->
    @if(isOpen()) {
      <div 
        (click)="close.emit()"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in duration-300">
      </div>
    }

    <!-- Drawer -->
    <div 
      class="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-2xl z-[70] transition-transform duration-300 ease-in-out border-l border-slate-200"
      [class.translate-x-0]="isOpen()"
      [class.translate-x-full]="!isOpen()">
      
      <!-- Drawer Header -->
      <div class="h-20 flex items-center justify-between px-6 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <i class="pi pi-bell"></i>
          </div>
          <h3 class="font-bold text-slate-900">Notifications</h3>
        </div>
        <button 
          (click)="close.emit()"
          class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Drawer Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        @for(notif of notifications; track notif.id) {
          <div class="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group">
            <div class="flex gap-3">
              <div [class]="'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + notif.bgClass">
                <i [class]="'pi ' + notif.icon + ' text-sm'"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <p class="text-sm font-bold text-slate-900">{{ notif.title }}</p>
                  <span class="text-[10px] font-medium text-slate-400">{{ notif.time }}</span>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed">{{ notif.message }}</p>
              </div>
            </div>
          </div>
        } @empty {
          <div class="h-64 flex flex-col items-center justify-center text-center p-6">
            <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <i class="pi pi-bell-slash text-2xl"></i>
            </div>
            <p class="text-slate-900 font-bold text-sm">No notifications yet</p>
            <p class="text-slate-500 text-xs">We'll let you know when something important happens.</p>
          </div>
        }
      </div>

      <!-- Drawer Footer -->
      <div class="p-4 border-t border-slate-100">
        <button class="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
          Mark all as read
        </button>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class IkgsNotificationDrawer {
    isOpen = input<boolean>(false);
    close = output<void>();

    notifications = [
        {
            id: 1,
            title: 'Success!',
            message: 'New project "Spring Collection" created successfully.',
            time: '2m ago',
            icon: 'pi-check-circle',
            bgClass: 'bg-emerald-50 text-emerald-600'
        },
        {
            id: 2,
            title: 'Alert',
            message: 'High CPU usage detected on production server 01.',
            time: '1h ago',
            icon: 'pi-exclamation-triangle',
            bgClass: 'bg-amber-50 text-amber-600'
        },
        {
            id: 3,
            title: 'New Member',
            message: 'John Doe joined the administration team.',
            time: '4h ago',
            icon: 'pi-user-plus',
            bgClass: 'bg-indigo-50 text-indigo-600'
        }
    ];
}
