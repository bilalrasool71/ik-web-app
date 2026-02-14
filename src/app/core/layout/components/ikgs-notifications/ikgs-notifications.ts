import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ikgs-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="onClick.emit()"
      class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all relative">
      <i class="pi pi-bell text-base sm:text-lg"></i>
      @if(count() > 0) {
        <span class="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
          {{ count() }}
        </span>
      }
    </button>
  `
})
export class IkgsNotifications {
  count = input<number>(0);
  onClick = output<void>();
}
