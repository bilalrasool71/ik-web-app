import { Component } from '@angular/core';

@Component({
    selector: 'app-ikgs-search',
    standalone: true,
    template: `
    <div class="hidden sm:flex items-center relative group">
      <i class="pi pi-search absolute left-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"></i>
      <input type="text" placeholder="Search..." 
             class="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-400 transition-all w-48 lg:w-64">
    </div>
  `
})
export class IkgsSearch { }
