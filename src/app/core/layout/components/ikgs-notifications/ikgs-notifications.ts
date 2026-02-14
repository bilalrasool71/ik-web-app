import { Component } from '@angular/core';

@Component({
    selector: 'app-ikgs-notifications',
    standalone: true,
    template: `
    <button class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all relative">
      <i class="pi pi-bell text-base sm:text-lg"></i>
      <span class="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
    </button>
  `
})
export class IkgsNotifications { }
