import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ikgs-login',
  imports: [ReactiveFormsModule],
  templateUrl: './ikgs-login.html',
  styleUrl: './ikgs-login.scss',
})
export class IkgsLogin {
  router = inject(Router);


  loginForm: FormGroup = this.initForm();
  loading: WritableSignal<boolean> = signal<boolean>(false);
  showPassword: WritableSignal<boolean> = signal<boolean>(false);


  initForm(): FormGroup {
    return new FormGroup({
      username: new FormControl<string>('', [Validators.required]),
      password: new FormControl<string>('', [Validators.required])
    });
  };

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  };

  onSubmit() {
    this.loading.set(true);
  }

  

}
