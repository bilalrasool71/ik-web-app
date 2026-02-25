import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { UserLoginRequestDto, UserLoginResponseDto } from '../../../models/domain/user.model';
import { RequestType, Repository, EndPoints } from '../../../core/enums/api.enum';
import { LocalStorageEnum, CookiesEnum } from '../../../core/enums/storage.enum';
import { ApiOptionsModel, ApiResponseModel } from '../../../core/models/api.model';
import { IkgsRest } from '../../../core/services/ikgs-rest';
import { IkgsShared } from '../../../core/services/ikgs-shared';

@Component({
  selector: 'app-ikgs-login',
  imports: [ReactiveFormsModule],
  templateUrl: './ikgs-login.html',
  styleUrl: './ikgs-login.scss',
})
export class IkgsLogin {
  router = inject(Router);
  messageService = inject(MessageService);
  restService = inject(IkgsRest);
  sharedService = inject(IkgsShared);


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

  Authorize() {
    this.loading.set(true);
    let userObj: UserLoginRequestDto = new UserLoginRequestDto();
    userObj.username = this.loginForm.value.username;
    userObj.password = this.loginForm.value.password;
    let authApiOpts: ApiOptionsModel<UserLoginRequestDto> = new ApiOptionsModel<UserLoginRequestDto>();
    authApiOpts.RequestType = RequestType.POST;
    authApiOpts.ParamObj = userObj;
    authApiOpts.Repository = Repository.Auth;
    authApiOpts.EndPoint = EndPoints.Auth;
    this.restService.CallApi<UserLoginRequestDto, UserLoginRequestDto>(authApiOpts).subscribe(
      (result: ApiResponseModel<UserLoginResponseDto>) => {
        if (result) {
          if (result.Code === 200) {
            if (result.Data) {
              this.loading.set(false);
              if (result.Data.token) {
                localStorage.setItem(LocalStorageEnum.TokenInfo, JSON.stringify(result.Data.token));
                this.messageService.add({ severity: 'success', summary: 'Success!', detail: `Welcome ${result.Data.username} !` });
                this.router.navigate(['ikgs/dashboard'])
              }
            }
          }
        } else {
          this.loading.set(false)
        }
      },
      (error: any) => {
        this.loading.set(false);
      }
    );
  }
}
