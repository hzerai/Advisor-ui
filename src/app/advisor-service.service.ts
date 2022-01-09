import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Exception } from './Exception';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AdvisorServiceService {
  private api = environment.api ;

  constructor(private http: HttpClient) { }

  analyseLog(log, fromDate: Date, toDate: Date, exceptionNameFilter): Observable<Exception[]> {
    let params = new HttpParams();
    if (fromDate != null) {
      var date = new Date();
      date.setTime(fromDate.getTime() + (60 * 60 * 1000));
      params = params.append('fromDate', date.toISOString())
    }
    if (toDate != null) {
      var date = new Date();
      date.setTime(toDate.getTime() + (60 * 60 * 1000));
      params = params.append('toDate', date.toISOString())
    }
    if (exceptionNameFilter != null) {
      params = params.append('exceptionName', exceptionNameFilter)
    }
    return this.http.post<Exception[]>(this.api, log, { params });
  }

}
