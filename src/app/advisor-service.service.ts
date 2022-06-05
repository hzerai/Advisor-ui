import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exception } from './Exception';
import { environment } from 'src/environments/environment';
import { ExceptionData } from './ExceptionData';
@Injectable({
  providedIn: 'root'
})
export class AdvisorServiceService {

  private api = environment.api;

  constructor(private http: HttpClient) { }

  analyseLog(log, fromDate: Date, toDate: Date, exceptionNameFilter, def: boolean = false): Observable<Exception[]> {
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
    if (def) {
      params = params.append('def', def)
    }
    if (exceptionNameFilter != null) {
      params = params.append('exceptionName', exceptionNameFilter)
    }
    return this.http.post<Exception[]>(this.api, log, { params });
  }

  palmyraCorrelationId(log, fromDate: Date, toDate: Date, exceptionNameFilter: string): Observable<Map<string, ExceptionData[]>> {
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
    return this.http.post<Map<string, ExceptionData[]>>(this.api + '/palmyraCorrelation', log, { params });
  }

  analyseJiraTicket(jiraId, fromDate: Date, toDate: Date, exceptionNameFilter, def: boolean = false): Observable<Exception[]> {

    let params = new HttpParams();
    if (jiraId != null) {
      params = params.append('jiraId', jiraId.toString().toUpperCase())
    } else {
      return null;
    }
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
    if (def) {
      params = params.append('def', def)
    }
    if (exceptionNameFilter != null) {
      params = params.append('exceptionName', exceptionNameFilter)
    }
    return this.http.get<Exception[]>(this.api, { params });
  }

  jiraAsHtml(jiraId: string): Observable<string> {

    let headers = new HttpHeaders();
    headers.append('Accept', 'text/plain');
    let params = new HttpParams();
    if (jiraId != null) {
      params = params.append('jiraId', jiraId.toString().toUpperCase())
    } else {
      return null;
    }
    return this.http.get<string>(this.api + "/html", { headers, params });
  }

  analyseStacktrace(stacktracetext: string): Observable<Exception[]> {
    return this.http.post<Exception[]>(this.api, stacktracetext);
  }

}
