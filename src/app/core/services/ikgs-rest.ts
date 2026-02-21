import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IkgsRest {
  baseApiUrl: WritableSignal<string> = signal('');

  constructor() {
    if (location.origin.includes('localhost')) {
      this.baseApiUrl.set('https://localhost:7251/api/')
    } else {
      this.baseApiUrl.set('https://ikgsapi.com/api/')
    }
  }
}
