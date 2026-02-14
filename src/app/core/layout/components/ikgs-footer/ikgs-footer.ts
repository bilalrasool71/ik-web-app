import { Component } from '@angular/core';

@Component({
    selector: 'app-ikgs-footer',
    standalone: true,
    template: `
    <footer class="h-10 bg-white border-t border-slate-200 flex items-center justify-center px-8 shrink-0 relative z-20">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        IKGS <span class="mx-2 text-slate-300">|</span> <span class="text-slate-500">Innoknits Global Sourcing</span>
      </p>
    </footer>
  `
})
export class IkgsFooter { }
