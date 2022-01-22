import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PageChangedEvent } from 'ngx-bootstrap/pagination';
import { PalmyraExceptionData } from '../PalmyraExceptionData';
import { CorrelationsService } from './correlations.service';

@Component({
  selector: 'app-correlation',
  templateUrl: './correlation.component.html',
  styleUrls: ['./correlation.component.css']
})

export class CorrelationComponent implements OnInit {

  @Input('correlations') correlations: Map<string, PalmyraExceptionData[]>;
  @Output('transSearch') transSearch: EventEmitter<string> = new EventEmitter<string>();
  correlationKeysPage: string[];
  currentPage: number;
  compactViewItems: { id: string, color: string }[];
  filtredItems: [];
  filtered: boolean = false;
  constructor(private correlationService: CorrelationsService) { }

  ngOnInit(): void {
    this.sortCorrelationMap();
    this.prepareCompactView();
    this.correlationKeysPage = this.correlationKeys().slice(0, 10);
    this.currentPage = this.correlationService.pageNumber();
  }

  correlationKeys(): string[] {
    if (this.filtered) {
      return this.correlationKeysPage;
    }
    return Array.from(this.correlations.keys());
  }

  correlationValues(key: string): PalmyraExceptionData[] {
    return this.correlations.get(key);
  }

  correlationKeysPageChanged(event: PageChangedEvent): void {
    this.correlationService.setPageNumber(event.page);
    this.correlationService.setStart((event.page - 1) * event.itemsPerPage);
    this.correlationService.setEnd(event.page * event.itemsPerPage);
    this.correlationKeysPage = this.correlationKeys().slice(this.correlationService.start(), this.correlationService.end());
  }

  analysisView() {
    this.transSearch.emit('back');
  }
  transactionalSearch(id) {
    console.log(id)

    this.transSearch.emit(id);
  }

  sortCorrelationMap() {
    this.correlations = new Map([...this.correlations.entries()].sort((a, b) => {
      return new Date(a[1][0].date).getTime() - new Date(b[1][0].date).getTime();
    }));
  }

  prepareCompactView() {
    this.compactViewItems = [];
    this.correlations.forEach((v, k) => {
      let colors = Array.from(new Set(v.map(e => e.level)));
      if (colors.find(c => c === 'ERROR' || c === 'SEVERE' || c === 'FATAL')) {
        this.compactViewItems.push({ id: k, color: 'bg-danger' });
      } else if (colors.find(c => c === 'WARN' || c === 'WARNING')) {
        this.compactViewItems.push({ id: k, color: 'bg-warning' });
      } else if (colors.find(c => c === 'INFO')) {
        this.compactViewItems.push({ id: k, color: 'bg-info' });
      } else if (colors.find(c => c === 'DEBUG')) {
        this.compactViewItems.push({ id: k, color: 'bg-primary' });
      } else {
        this.compactViewItems.push({ id: k, color: 'bg-secondary' });
      }
    })
  }

  showExButton(id): boolean {
    return this.compactViewItems.find(i => i.id === id).color === 'bg-danger';
  }



  search: string;
  filterCorrelation: string[];
  filterThreads: string[];
  filterLevels: string[];
  filterLoggers: string[];
  filterAppNames: string[];
  filterUsers: string[];
  filterTenants: string[];
  filterObject: { id: string, level: string, thread: string, logger: string, app: string, user: string, tenant: string, dateRange: Date[], fromTime: Date, toTime: Date } = {
    id: null,
    level: null,
    thread: null,
    logger: null,
    app: null,
    user: null,
    tenant: null,
    dateRange: [],
    fromTime: null,
    toTime: null
  }

  initFilter() {
    if (!this.filterCorrelation) {
      const ids = [];
      const threads = [];
      const users = [];
      const tenants = [];
      const loggers = [];
      const levels = [];
      const apps = [];
      this.correlations.forEach((v, k) => {
        v.forEach(exception => {
          ids.push(exception.transaction)
          users.push(exception.user)
          tenants.push(exception.tenant)
          levels.push(exception.level)
          threads.push(exception.thread)
          loggers.push(exception.logger)
          apps.push(exception.application)
        })
      });
      this.filterCorrelation = Array.from(new Set(ids));
      this.filterUsers = Array.from(new Set(users));
      this.filterTenants = Array.from(new Set(tenants));
      this.filterAppNames = Array.from(new Set(apps));
      this.filterThreads = Array.from(new Set(threads));
      this.filterLevels = Array.from(new Set(levels));
      this.filterLoggers = Array.from(new Set(loggers));
    }

  }

  filterUsingObject() {
    this.search = null;
    let id = this.filterObject.id;
    let user = this.filterObject.user;
    let tenant = this.filterObject.tenant;
    let app = this.filterObject.app;
    let thread = this.filterObject.thread;
    let level = this.filterObject.level;
    let logger = this.filterObject.logger;
    let fromDate = this.filterObject.dateRange[0];
    let toDate = this.filterObject.dateRange[1];
    if (fromDate) {
      if (this.filterObject.fromTime) {
        fromDate.setHours(this.filterObject.fromTime.getHours())
        fromDate.setSeconds(this.filterObject.fromTime.getSeconds())
        fromDate.setMinutes(this.filterObject.fromTime.getMinutes())
      } else {
        fromDate.setHours(0)
        fromDate.setSeconds(0)
        fromDate.setMinutes(0)
      }
    }
    if (toDate) {
      if (this.filterObject.toTime) {
        toDate.setHours(this.filterObject.toTime.getHours())
        toDate.setSeconds(this.filterObject.toTime.getSeconds())
        toDate.setMinutes(this.filterObject.toTime.getMinutes())
      } else {
        toDate.setHours(23)
        toDate.setSeconds(59)
        toDate.setMinutes(59)
      }
    }
    if ((user && user != 'null') || tenant || (app && app != 'null') || (id && id != 'null') || (thread && thread != 'null') || (level && level != 'null') || (logger && logger != 'null') || fromDate || toDate) {
      const temps = [];
      this.correlationKeys().forEach(k => this.correlationValues(k).forEach((ex) => {
        if (user && user != ex.user) {
          return;
        }
        if (tenant && tenant != ex.tenant) {
          return;
        }
        if (app && app != ex.application) {
          return;
        }
        if (id && id != ex.transaction) {
          return;
        }
        if (thread && thread != ex.thread) {
          return;
        }
        if (level && level != ex.level) {
          return;
        }
        if (logger && logger != ex.logger) {
          return;
        }
        if (fromDate && new Date(fromDate).getTime() > new Date(ex.date).getTime()) {
          return;
        }
        if (toDate && new Date(toDate).getTime() < new Date(ex.date).getTime()) {
          return;
        }
        temps.push(ex.transaction);
      }));
      this.correlationKeysPage = Array.from(new Set(temps));
      this.filtered = true;
    }
  }

  filterbyId(id) {

    this.correlationKeysPage = [id];
    this.filtered = true;
  }

  restUsingObject() {
    this.search = null;
    this.filtered = false;
    this.correlationKeysPage = this.correlationKeys();
    this.correlationKeysPageChanged({ page: 1, itemsPerPage: 5 })
    this.filterObject = {
      id: null,
      level: null,
      thread: null,
      logger: null,
      app: null,
      user: null,
      tenant: null,
      dateRange: [],
      fromTime: null,
      toTime: null
    };
  }

  updateCorrelations() {
    if (this.search && this.search.length > 4) {
      setTimeout(() => {
        const temps = [];
        this.correlationKeys().forEach(k => this.correlationValues(k).filter(e =>
          JSON.stringify(e, (key: string, value: any) => value).toLowerCase().includes(this.search.toLowerCase())

        ).forEach(e => temps.push(e.transaction)));
        this.correlationKeysPage = Array.from(new Set(temps));
        this.filtered = true;
      }, 1000)
    } else {
      this.filtered = false;
      this.correlationKeysPage = this.correlationKeys();
      this.correlationKeysPageChanged({ page: 1, itemsPerPage: 5 })
    }

  }

}
