import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Exception } from './Exception';
@Injectable({
  providedIn: 'root'
})
export class AdvisorServiceService {

  constructor(private http: HttpClient) { }

  analyseLog(log): Observable<Exception[]> {
    return this.http.post<Exception[]>("http://localhost:8080/api", log);
  }

}
