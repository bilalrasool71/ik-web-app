import { Component, inject, Signal, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Toast } from 'primeng/toast';
import { IkgsLoading } from './core/services/ikgs-loading';
import { delay } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss',

})
export class App {
  loading: WritableSignal<boolean> = signal(false);
  protected readonly title = signal('IkWebApp');
  loadingService = inject(IkgsLoading);
  ngOnInit() {
    this.listenToLoading();
  }


  listenToLoading() {
    this.loadingService.$loadingSub
      .pipe(delay(0))
      .subscribe((loading) => {
        this.loading.set(loading);
      });
  }

  
}
