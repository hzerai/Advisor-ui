import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CorrelationsService {
  static correlationPage: CorrelationPage;

  constructor() {
    CorrelationsService.correlationPage = new CorrelationPage();
  }

  start(): number {
    return CorrelationsService.correlationPage.startItem;
  }

  end(): number {
    return CorrelationsService.correlationPage.endItem;
  }

  pageNumber(): number {
    return CorrelationsService.correlationPage.pn;
  }

  setStart(start: number): void {
    CorrelationsService.correlationPage.startItem = start;
  }

  setEnd(end: number): void {
    CorrelationsService.correlationPage.endItem = end;
  }
  setPageNumber(n: number): void {
    CorrelationsService.correlationPage.pn = n;
  }

}


class CorrelationPage {

  public startItem: number = 0;
  public endItem: number = 10;
  public pn: number = 1;

}
