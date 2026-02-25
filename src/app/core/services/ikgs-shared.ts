import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import crypto from "crypto-js";

@Injectable({
  providedIn: 'root',
})
export class IkgsShared {
  private secretKey = "YourSecretKeyForEncryption&Descryption";
  cookieService = inject(CookieService);
  router = inject(Router);

  validateToken(): boolean {
    return true;
  }

  logout() {
    localStorage.clear();
    this.cookieService.deleteAll();
    this.router.navigate(['/']);
  }

  encrypt(value: string): string {
    return crypto.AES.encrypt(value, this.secretKey).toString();
  }

  decrypt(value: string): string {
    return crypto.AES.decrypt(value, this.secretKey).toString(crypto.enc.Utf8);
  }

  getContrastColor(c: string) {
    return ["#000", "#fff"][~~([.299, .587, .114].reduce((r, v, i) => parseInt(c.substring(i * 2 + 1, 2), 16) * v + r, 0) < 128)];

  }

}
