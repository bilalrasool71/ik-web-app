import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal, WritableSignal } from '@angular/core';
import { map, catchError, Observable, throwError } from 'rxjs';
import { RequestType } from '../enums/api.enum';
import { ApiOptionsModel, ApiResponseModel } from '../models/api.model';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class IkgsRest {
  baseUrl: WritableSignal<string> = signal('');

  constructor(private http: HttpClient, private datePipe: DatePipe) {
    if (location.origin.includes('localhost')) {
      this.baseUrl.set('https://localhost:7251/api/')
    } else {
      this.baseUrl.set('10.10.100.10:4101/kgsapi/api/')
    }
  }

  CallApi<ResModel, T>(options: ApiOptionsModel<T>): any | null {
    let headers = new HttpHeaders();
    if (options.RequestType === RequestType.POST) {
      let fileHttpHeaders;
      if ((options.ParamObj instanceof FormData)) {
        return this.http.post<ApiResponseModel<ResModel>>(this.baseUrl() + options.Repository + options.EndPoint, options.ParamObj, { reportProgress: true, observe: 'events' }).pipe(map(res => res), catchError(this.errorHandler));
      }
      else {
        fileHttpHeaders = new HttpHeaders({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return this.http.post<ApiResponseModel<ResModel>>(this.baseUrl() + options.Repository + options.EndPoint, options.ParamObj, { headers: fileHttpHeaders }).pipe(map(res => res), catchError(this.errorHandler));
      }
    }
    else if (options.RequestType === RequestType.GET) {
      let url: string = this.baseUrl() + options.Repository + options.EndPoint;
      if (options.ReqQueryParams && options.ReqQueryParams.length > 0) {
        options.ReqQueryParams.forEach((param, index) => {
          if (param.IsDate === true) {
            param.Value = this.datePipe.transform(new Date(param.Value), 'shortDate')
          }
          if (index === 0) {
            url = `${url}?${param.Key}=${param.Value}`;
          }
          else {
            url = `${url}&${param.Key}=${param.Value}`;
          }
        });
      }
      return this.http.get<ApiResponseModel<ResModel>>(url, { headers: headers }).pipe(map(res => res), catchError(this.errorHandler));
    }
    else {
      return null;
    }
  }


  errorHandler(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.status === 0) {
      errorMessage = 'Network error: Unable to connect to the server.';
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.error && error.error.Message) {
      errorMessage = error.error.Message;
    } else if (error.Message) {
      errorMessage = error.Message;
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage
    }));
  }
}
