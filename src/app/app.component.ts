import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AdvisorServiceService } from './advisor-service.service';
import { BubbleChartComponent } from './bubble-chart/bubble-chart.component';
import { Exception } from './Exception';
import { ExceptionData } from './ExceptionData';
import * as JSZip from 'jszip';
import { PieChartComponent } from './pie-chart/pie-chart.component';
import { LineChartComponent } from './line-chart/line-chart.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { PalmyraExceptionData } from './PalmyraExceptionData';
import { ProgressbarConfig } from 'ngx-bootstrap/progressbar';

export function getProgressbarConfig(): ProgressbarConfig {
  return Object.assign(new ProgressbarConfig(), { animate: true, striped: true, max: 100 });
}
let zipFile: JSZip = new JSZip();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [{ provide: ProgressbarConfig, useFactory: getProgressbarConfig }]
})
export class AppComponent implements OnInit {
  date: Date = new Date();
  @ViewChild(PieChartComponent) pie: PieChartComponent | undefined;
  @ViewChild('line') line: LineChartComponent | undefined;
  @ViewChild('selectionLine') selectionLine: LineChartComponent | undefined;
  bubEx: Exception;
  savedReports: { date: string, data: Exception[], lineData: any, fileName: string, appName: string }[];
  folderFiles: { fileName: string, count: number, time: number }[];
  log: { name: string, bytes: any };
  exceptions: Exception[];
  db: Exception[];
  sortedByFirstOccurence: boolean = false;
  sortedByLastOccurence: boolean = false;
  sortedByName: boolean = false;
  sortedByCount: boolean = false;
  search: string = "";
  uploading: string;
  lineData: Date[] = [];
  selectionLineData: Date[] = [];
  currentFile: string;
  fromDate: Date;
  fromTime: Date;
  toDate: Date;
  toTime: Date;
  exceptionNameFilter: string;
  file: any;
  files: FileList;
  fileNb: number = 0;
  showFilter: boolean = false;
  appName: string;
  downloading: string;
  showCharts: boolean = true;
  jiraId: string = null;
  theme: string = 'dark';
  filesStartSize: number = 0;
  stacktrace: boolean = false;
  stacktracetext: string;
  changeTheme() {
    if (this.theme == 'dark') {
      this.theme = 'primary';
    } else {
      this.theme = 'dark';
    }
    window.localStorage.setItem('advisor-theme', this.theme)
  }
  constructor(private advisor: AdvisorServiceService) { }

  ngOnInit(): void {
    var saved: string = window.localStorage.getItem('savedReports');
    var themeColor: string = window.localStorage.getItem('advisor-theme');
    if (themeColor) {
      this.theme = themeColor;
    }
    if (saved) {
      this.savedReports = JSON.parse(saved);
    }
  }

  fileChange(event) {
    if (event.target.files.length == 1) {
      this.file = event.target.files[0];
    } else if (event.target.files.length > 1) {
      this.files = event.target.files;
    } else {
      this.file = null;
      this.files = null;
    }
  }

  analyseStacktrace() {
    this.initDateParams();
    this.folderFiles = [];
    this.exceptions = [];
    this.db = [];

    this.log = {
      name: "Stacktrace",
      bytes: null
    };
    this.currentFile = "Stacktrace";
    this.uploading = 'SCANNING Stacktrace, PLEASE HOLD...';
    this.folderFiles.push({ fileName: this.log.name, count: null, time: new Date().getTime() });
    this.advisor.analyseStacktrace(this.stacktracetext).subscribe(e => {
      if (!e) {
        e = [];
      }

      e.forEach(ex => {
        this.treatResultFromService(ex, ex.exception.logFile);
      })
      this.fileNb--;
      if (this.fileNb <= 0) {
        this.commitOneFile();
      }

    }, err => {
      this.rollbackOneFile(err);
    })
  }

  analyseFile() {
    if (!this.file && !this.files && !this.jiraId) {
      return;
    }
    this.initDateParams();
    this.folderFiles = [];
    this.exceptions = [];
    this.db = [];
    if (this.jiraId) {
      this.analyseLogUrl();
    } else if (this.file) {
      this.analyseOneFile();
    } else if (this.files) {
      this.analyseMultipleFiles();
    }
  }

  analyseLogUrl() {
    this.log = {
      name: this.jiraId,
      bytes: null
    };
    this.currentFile = this.jiraId;
    this.uploading = 'SCANNING FILE ' + this.log.name + ', PLEASE HOLD...';
    this.folderFiles.push({ fileName: this.log.name, count: null, time: new Date().getTime() });
    this.advisor.jiraAsHtml(this.jiraId).subscribe(e => console.log(e));
    this.advisor.analyseJiraTicket(this.jiraId, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
      if (!e) {
        e = [];
      }
      // if (this.correlationIdEnabled && e[0] && e[0].exception.framework == 'Palmyra') {
      //   this.advisor.palmyraCorrelationId(this.log.bytes, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
      //     Object.keys(e).forEach(k => {
      //       if (this.correlationIds.has(k)) {
      //         this.correlationIds.get(k).push(...e[k]);
      //       } else {
      //         this.correlationIds.set(k, e[k]);
      //       }
      //     })
      //   }, err => {
      //     console.log(err)
      //   });
      // }
      let f = this.folderFiles.find(f => f.fileName == this.jiraId);
      f.count = e.length;
      f.time = Math.round((new Date().getTime() - f.time) / 1000);
      e.forEach(ex => {
        this.treatResultFromService(ex, ex.exception.logFile);
      })
      this.fileNb--;
      if (this.fileNb <= 0) {
        this.commitOneFile();
      }

    }, err => {
      this.rollbackOneFile(err);
    })

  }

  private analyseMultipleFiles() {
    // this.multipeFilesConsole();
    this.fileNb = this.files.length;
    this.filesStartSize = this.fileNb;
    this.uploading = 'UPLOADING';
    for (var i = 0; i < this.files.length; i++) {
      const element = this.files.item(i);
      this.folderFiles.push({ fileName: element.name, count: null, time: new Date().getTime() });
      var reader = new FileReader();
      reader.readAsBinaryString(element);
      reader.onload = (event) => {
        this.processOneFile(event, element);
      };
    }
  }

  private processOneFile(event: ProgressEvent<FileReader>, element: File) {
    this.log = {
      bytes: event.target.result,
      name: element.name
    }
    this.currentFile = element.name;
    this.analyseTextFile(element.name);
  }

  // private multipeFilesConsole() {
  //   this.uploading = 'SCANNING Multiple files';
  //   this.log = {
  //     name: 'multiple',
  //     bytes: null
  //   };
  //   const text: string[] = [];
  //   text.push('SCANNING MULTIPLE FILES, PLEASE HOLD...');
  //   for (var i = 0; i < this.files.length; i++) {
  //     var element = this.files.item(i);
  //     text.push(element.name);
  //   }
  //   this.type(text);
  //   this.fileNb = this.files.length;
  // }

  private analyseOneFile() {
    this.log = {
      name: this.file.name,
      bytes: null
    };
    this.currentFile = this.log.name;
    if (this.log.name.endsWith('zip')) {
      this.handleZipFile();
    } else {
      this.handleTextFile();
    }
  }

  private handleTextFile() {
    this.uploading = 'SCANNING FILE ' + this.log.name + ', PLEASE HOLD...';
    this.folderFiles.push({ fileName: this.log.name, count: null, time: new Date().getTime() });
    var reader = new FileReader();
    reader.readAsBinaryString(this.file);
    reader.onload = (event) => {
      this.log.bytes = event.target.result;
      this.log.name = this.file.name;
      // this.type(this.uploading);
      this.analyseTextFile(null);
    };
  }

  private handleZipFile() {
    this.uploading = 'DEEP SCANNING ' + this.log.name + ', PLEASE HOLD...';
    zipFile.loadAsync(this.file).then((zip) => {
      // this.consoleZipFile(zip);
      this.fileNb = Object.keys(zip.files).length;
      this.filesStartSize = this.fileNb;
      Object.keys(zip.files).forEach((filename) => {
        if (!filename.endsWith('\'') && !filename.endsWith('/')) {
          this.folderFiles.push({ fileName: filename, count: null, time: new Date().getTime() });
          this.processOneFileInZip(zip, filename);
        } else {
          this.fileNb--;
        }
      });
    });
  }

  private processOneFileInZip(zip: JSZip, filename: string) {
    zip.files[filename].async('arraybuffer').then((fileData) => {
      this.advisor.analyseLog(fileData, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
        this.fileNb--;
        if (this.correlationIdEnabled && e[0] && e[0].exception.framework == 'Palmyra') {
          this.advisor.palmyraCorrelationId(fileData, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
            Object.keys(e).forEach(k => {
              e[k].forEach(ed => ed.logFile = filename)
              if (this.correlationIds.has(k)) {
                this.correlationIds.get(k).push(...e[k]);
              } else {
                this.correlationIds.set(k, e[k]);
              }
            })
          }, err => {
            console.log(err)
          });
        }
        let f = this.folderFiles.find(f => f.fileName == filename);
        f.count = e.length;
        f.time = Math.round((new Date().getTime() - f.time) / 1000);
        this.analyseZipEntry(e, filename);
        if (this.fileNb <= 0) {
          this.commitZipFile();
        }
      }, err => {
        this.fileNb--;
        console.log(err)
      });
    });
  }

  private analyseZipEntry(e: Exception[], filename: string) {
    e.forEach(ex => {
      this.treatResultFromService(ex, filename);
    });
  }

  private commitZipFile() {
    this.saveFileResultToLocalStorage()
    this.file = null;
    this.files = null;
    this.log = null;
  }

  // private consoleZipFile(zip: JSZip) {
  //   Object.keys(zip.files).forEach((filename) => {
  //     if (filename.trim().length != 0) {
  //       this.folderFiles.push({ fileName: filename, count: null, time: new Date().getTime() });
  //     }
  //   });
  //   var text: string[] = [];
  //   text.push(this.uploading);
  //   text.push('SCAN COMPLETE');
  //   text.push('FOUND ' + this.folderFiles.length + ' FILES');
  //   text.push('PRINTING...');
  //   this.folderFiles.forEach(v => text.push(v.fileName));
  //   this.type(text);
  // }

  private initDateParams() {
    if (this.fromDate) {
      if (this.fromTime) {
        this.fromDate.setHours(this.fromTime.getHours());
        this.fromDate.setSeconds(this.fromTime.getSeconds());
        this.fromDate.setMinutes(this.fromTime.getMinutes());
      } else {
        this.fromDate.setHours(0);
        this.fromDate.setSeconds(0);
        this.fromDate.setMinutes(0);
      }
    }
    if (this.toDate) {
      if (this.toTime) {
        this.toDate.setHours(this.toTime.getHours());
        this.toDate.setSeconds(this.toTime.getSeconds());
        this.toDate.setMinutes(this.toTime.getMinutes());
      } else {
        this.toDate.setHours(0);
        this.toDate.setSeconds(0);
        this.toDate.setMinutes(0);
      }
    }
  }

  correlationIds: Map<string, PalmyraExceptionData[]> = new Map();
  correlationView: boolean = false;


  analyseTextFile(fileName) {
    this.advisor.analyseLog(this.log.bytes, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
      {
        if (this.correlationIdEnabled && e[0] && e[0].exception.framework == 'Palmyra') {
          this.advisor.palmyraCorrelationId(this.log.bytes, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
            Object.keys(e).forEach(k => {
              e[k].forEach(ed => ed.logFile = fileName)
              if (this.correlationIds.has(k)) {
                this.correlationIds.get(k).push(...e[k]);
              } else {
                this.correlationIds.set(k, e[k]);
              }
            })
          }, err => {
            console.log(err)
          });
        }
        if (!fileName) {
          fileName = this.log.name;
        }
        let f = this.folderFiles.find(f => f.fileName == fileName);
        f.count = e.length;
        f.time = Math.round((new Date().getTime() - f.time) / 1000);
        e.forEach(ex => {
          this.treatResultFromService(ex, fileName);
        })
        this.fileNb--;
        if (this.fileNb <= 0) {
          this.commitOneFile();
        }
      }
    }, err => {
      this.rollbackOneFile(err);
    })
  }


  private rollbackOneFile(err: any) {
    this.fileNb--;
    this.db = [];
    this.exceptions = [];
    this.uploading = null;
    this.jiraId = null;
    this.log = null;
    this.file = null;
    this.files = null;
    this.folderFiles = null;
    console.log(err);
    this.error = err.statusText;
  }

  private commitOneFile() {
    this.saveFileResultToLocalStorage();
    this.file = null;
    this.files = null;
    this.log = null;
    this.jiraId = null;
  }

  private saveFileResultToLocalStorage() {
    if (this.files) {
      var filename = this.folderFiles.map(f => f.fileName).join('_');
    } else {
      var filename = this.log.name;
    }
    this.currentFile = filename;
    var saved: string = window.localStorage.getItem('savedReports');
    var savedItems: { date: string; data: Exception[]; lineData: any; fileName: string; appName: string; }[];
    if (saved != null) {
      savedItems = JSON.parse(saved);
      if (savedItems.length > 2) {
        savedItems.pop();
      }
    } else {
      savedItems = [];
    }
    savedItems.unshift({
      date: new Date().toISOString(),
      data: this.exceptions,
      lineData: this.lineData,
      fileName: filename,
      appName: this.appName
    });
    try {
      window.localStorage.setItem('savedReports', JSON.stringify(savedItems));
    } catch (Error) {
      try {
        window.localStorage.removeItem('savedReports');
        savedItems = [];
        savedItems.unshift({
          date: new Date().toISOString(),
          data: this.exceptions,
          lineData: this.lineData,
          fileName: filename,
          appName: this.appName
        });
        window.localStorage.setItem('savedReports', JSON.stringify(savedItems));
      } catch (Error) {
      }
    }
  }

  private treatResultFromService(ex: Exception, fileName: any) {
    var exe = this.prepare(ex, fileName);
    var foundEx = this.exceptions.find(e => {
      return e.key == exe.key;
    });
    var alreadyMapped = foundEx;
    if (alreadyMapped) {
      this.mergeTwoExceptions(alreadyMapped, exe, foundEx);
    } else {
      this.exceptions.push(exe);
      this.db.push(exe);
    }
  }

  private mergeTwoExceptions(alreadyMapped: Exception, exe: Exception, foundEx: Exception) {
    var ch = alreadyMapped.child;
    if (ch) {
      alreadyMapped = ch;
      while (alreadyMapped) {
        ch = alreadyMapped;
        alreadyMapped = alreadyMapped.child;
      }
      ch.child = exe;
    } else {
      alreadyMapped.child = exe;
    }
    foundEx.count = foundEx.count + exe.count;
  }

  occurences(exception: Exception): any {
    var result: ExceptionData[] = [];
    while (exception != null) {
      exception.exception.logFile = exception.logFile;
      result.unshift(exception.exception);
      exception = exception.child;
    }
    return result;
  }

  updateList() {
    if (this.search.length > 4) {
      var tempLineData = [];

      this.exceptions = [];
      this.db.filter(e =>
        JSON.stringify(e, (key: string, value: any) => value).toLowerCase().includes(this.search.toLowerCase())
      ).forEach(e => {
        tempLineData.push(e.firstOccurence);
        tempLineData.push(e.lastOccurence);
        this.exceptions.push(e);
      });
      this.line.lineData = tempLineData;
      this.line.ngOnInit();
      this.line.chart.update();
    } else {
      this.exceptions = [];
      this.db.forEach(e => this.exceptions.push(e));
      this.line.lineData = this.lineData;
      this.line.ngOnInit();
      this.line.chart.update();
    }

    this.pie.exceptions = this.exceptions;
    this.pie.ngOnInit();
    this.pie.chart.update();
  }

  error: any;
  loadSavedReport(savedReport) {
    this.exceptions = savedReport.data;
    this.db = savedReport.data;
    this.lineData = savedReport.lineData;
    this.currentFile = savedReport.fileName;
    this.appName = savedReport.appName;
  }


  prepare(ex: Exception, fileName: string) {
    ex.logFile = fileName;
    ex.count = 1;
    ex.lastOccurence = ex.exception.date;
    ex.firstOccurence = ex.exception.date;
    this.lineData.push(ex.exception.date);
    if (!this.appName && 'Palmyra' == ex.exception.framework) {
      this.appName = (<PalmyraExceptionData>ex.exception).application;
    }
    ex.exception.causedBy.reverse();
    var ch: Exception = ex.child;
    var message: string = ex.exception.message;
    while (ch != null) {
      ch.logFile = fileName;
      ch.exception.causedBy.reverse();
      ex.firstOccurence = ch.exception.date;
      this.lineData.push(ch.exception.date);
      ex.count = ex.count + 1;
      var chMsg: string = ch.exception.message;
      if (chMsg != null && !(chMsg.trim() == '') && !("null" == (chMsg.trim()))) {
        message = chMsg;
      }
      ch = ch.child;
    }

    var localMsg: string = ex.exception.message;
    if (message != null && localMsg == null || (localMsg.trim() == '') || ("null" == localMsg.trim())) {
      localMsg = message;
    }
    if (localMsg == null || localMsg == '' || "null" == localMsg) {
      localMsg = "empty";
    }
    ex.message = localMsg;
    return ex;
  }

  sortByFirstOccurence() {
    if (this.sortedByFirstOccurence) {
      this.exceptions.sort((b: Exception, a: Exception) => {
        var first = a.firstOccurence == null ? 0 : new Date(a.firstOccurence).getTime();
        var second = b.firstOccurence == null ? 0 : new Date(b.firstOccurence).getTime();
        return first - second;
      });
    } else {
      this.exceptions.sort((a: Exception, b: Exception) => {
        var first = a.firstOccurence == null ? 0 : new Date(a.firstOccurence).getTime();
        var second = b.firstOccurence == null ? 0 : new Date(b.firstOccurence).getTime();
        return first - second;
      });

    }
    this.sortedByFirstOccurence = !this.sortedByFirstOccurence;
  }

  sortByLastOccurence() {
    if (this.sortedByLastOccurence) {
      this.exceptions.sort((b: Exception, a: Exception) => {
        var first = a.lastOccurence == null ? 0 : new Date(a.lastOccurence).getTime();
        var second = b.lastOccurence == null ? 0 : new Date(b.lastOccurence).getTime();
        return first - second;
      });
    } else {
      this.exceptions.sort((a: Exception, b: Exception) => {
        var first = a.lastOccurence == null ? 0 : new Date(a.lastOccurence).getTime();
        var second = b.lastOccurence == null ? 0 : new Date(b.lastOccurence).getTime();
        return first - second;
      });

    }
    this.sortedByLastOccurence = !this.sortedByLastOccurence;
  }

  sortByName() {
    if (this.sortedByName) {
      this.exceptions.sort((b: Exception, a: Exception) => {
        return (a.exception.name > b.exception.name) ? 1 : -1;
      });
    } else {
      this.exceptions.sort((a: Exception, b: Exception) => {
        return (a.exception.name > b.exception.name) ? 1 : -1;
      });

    }
    this.sortedByName = !this.sortedByName;
  }

  sortByCount() {
    if (this.sortedByCount) {
      this.exceptions.sort((b: Exception, a: Exception) => {
        return a.count - b.count;
      });
    } else {
      this.exceptions.sort((a: Exception, b: Exception) => {
        return a.count - b.count;
      });
    }
    this.sortedByCount = !this.sortedByCount;
  }


  updateBubbleChart(event) {
    const name = event.exception.name;
    const result: Date[] = [];
    while (event != null) {
      event.exception.logFile = event.logFile;
      result.unshift(event.exception.date);
      event = event.child;
    }
    this.selectionLine.label = name;
    this.selectionLine.lineData = result;
    this.selectionLine.ngOnInit();
    this.selectionLine.chart.update();
  }

  // type(text) {
  //   setTimeout(() => {
  //     var screen = document.getElementById('screen');
  //     if (!text || !text.length || !(screen instanceof Element)) {
  //       return;
  //     }
  //     if ('string' !== typeof text) {
  //       text = text.join('\n');
  //     }

  //     text = text.replace(/\r\n?/g, '\n').split('');
  //     var prompt: any = screen.lastChild;
  //     prompt.className = 'idle';

  //     const typer = function () {
  //       var character = text.shift();
  //       screen.removeChild(prompt)
  //       if (character === '\n') {
  //         screen.innerText = "";
  //       } else {
  //         screen.innerText = screen.innerText + character
  //       }
  //       screen.appendChild(prompt)
  //       if (text.length) {
  //         setTimeout(typer, 50);
  //       }
  //     };
  //     setTimeout(typer, 100);
  //   }, 100);

  // };

  getClippedRegion(image, x, y, width, height) {

    var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    //                   source region         dest. region
    ctx.drawImage(image, x, y, width, 2730, 0, 0, width, 2730);

    return canvas;
  }

  SavePDF() {
    this.downloading = 'pdf';

    setTimeout(() => {
      this.expandAll();
      let content = document.getElementById('content');
      let PDF = new jsPDF('p', 'mm', 'a4', true);
      html2canvas(content).then(canvas => {
        let fileWidth = 210;
        let fileHeight = canvas.height * fileWidth / canvas.width;
        for (var i = 0; i < canvas.height / 2730; ++i) {
          const content = this.getClippedRegion(canvas, 0, 2700 * i, canvas.width, canvas.height).toDataURL('image/png', 0.5)
          if (i > 0) {
            PDF.addPage('a4', 'p')
            PDF.setPage(i + 1)
          }
          PDF.addImage(content, 'PNG', 0, 0, fileWidth, fileHeight - 20)
        }

      }).finally(() => {
        PDF.save(this.currentFile + '__' + new Date().toISOString() + '__Advisor-Analysis.pdf');
        this.collapseAll();
        this.downloading = null;
      });
    }, 1000);


  }

  exportexcel(): void {
    this.downloading = 'excel';
    setTimeout(() => {
      let element = document.getElementById('excel-table');
      const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Advisor-Analysis');
      XLSX.writeFile(wb, this.currentFile + '__' + new Date().toISOString() + '__Advisor-Analysis.xlsx');
      this.downloading = null;
    }, 1000);
  }

  filterNames: string[];
  filterThreads: string[];
  filterLevels: string[];
  filterLoggers: string[];
  filterFiles: string[];
  filterUsers: string[];
  filterTenants: string[];
  filterObject: { name: string, level: string, thread: string, logger: string, file: string, user: string, tenant: string, dateRange: Date[], fromTime: Date, toTime: Date } = {
    name: null,
    level: null,
    thread: null,
    logger: null,
    file: null,
    user: null,
    tenant: null,
    dateRange: [],
    fromTime: null,
    toTime: null
  }

  initFilter() {
    if (!this.filterNames) {
      const names = [];
      const threads = [];
      const users = [];
      const tenants = [];
      const loggers = [];
      const levels = [];
      const files = [];
      this.db.forEach(exception => {
        let ch = exception;
        while (ch != null) {
          names.push(ch.exception.name)
          if (this.appName && (<PalmyraExceptionData>ch.exception).user) {
            users.push((<PalmyraExceptionData>ch.exception).user)
          }
          if (this.appName && (<PalmyraExceptionData>ch.exception).tenant) {
            tenants.push((<PalmyraExceptionData>ch.exception).tenant)
          }
          files.push(ch.logFile)
          levels.push(ch.exception.level)
          threads.push(ch.exception.thread)
          loggers.push(ch.exception.logger)
          ch = ch.child;
        }
      })

      this.filterNames = Array.from(new Set(names));
      this.filterUsers = Array.from(new Set(users));
      this.filterTenants = Array.from(new Set(tenants));
      this.filterFiles = Array.from(new Set(files));
      this.filterThreads = Array.from(new Set(threads));
      this.filterLevels = Array.from(new Set(levels));
      this.filterLoggers = Array.from(new Set(loggers));
    }

  }

  filterUsingObject() {
    this.search = null;
    let name = this.filterObject.name;
    let user = this.filterObject.user;
    let tenant = this.filterObject.tenant;
    let file = this.filterObject.file;
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

    var temp;
    if ((user && user != 'null') || (tenant && tenant != 'null') || (file && file != 'null') || (name && name != 'null') || (thread && thread != 'null') || (level && level != 'null') || (logger && logger != 'null') || fromDate || toDate) {
      var tempLineData = [];
      this.exceptions = this.db.map(e => {
        const childs = [];
        var ch = e;
        while (ch != null) {
          if (user && user != (<PalmyraExceptionData>ch.exception).user) {
            ch = ch.child;
            continue;
          }
          if (tenant && tenant != (<PalmyraExceptionData>ch.exception).tenant) {
            ch = ch.child;
            continue;
          }
          if (file && file != ch.logFile) {
            ch = ch.child;
            continue;
          }
          if (name && name != ch.exception.name) {
            ch = ch.child;
            continue;
          }
          if (thread && thread != ch.exception.thread) {
            ch = ch.child;
            continue;
          }
          if (level && level != ch.exception.level) {
            ch = ch.child;
            continue;
          }
          if (logger && logger != ch.exception.logger) {
            ch = ch.child;
            continue;
          }
          if (fromDate && new Date(fromDate).getTime() > new Date(ch.exception.date).getTime()) {
            ch = ch.child;
            continue;
          }
          if (toDate && new Date(toDate).getTime() < new Date(ch.exception.date).getTime()) {
            ch = ch.child;
            continue;
          }
          ch.todo = e.todo;
          ch.hint = e.hint;
          temp = JSON.parse(JSON.stringify(ch));
          tempLineData.push(ch.exception.date);
          childs.push(temp);
          ch = ch.child;
        }
        var result = childs[0];
        for (var i = 1; i < childs.length; ++i) {
          if (childs[i].stacktrace) {
            childs[0].exception.stacktrace = childs[i].exception.stacktrace;
            childs[0].exception.causedBy = childs[i].exception.causedBy;
          }
          childs[i - 1].child = childs[i];
        }
        if (result) {
          result.count = childs.length;
          result.firstOccurence = childs[0].firstOccurence;
          result.lastOccurence = childs[childs.length - 1].firstOccurence;
        }
        return result;
      }
      ).filter(e => e)
      this.line.lineData = tempLineData;
      this.line.ngOnInit();
      this.line.chart.update();
      this.pie.exceptions = this.exceptions;
      this.pie.ngOnInit();
      this.pie.chart.update();
    } else {
      this.exceptions = this.db;
      this.line.lineData = this.lineData;
      this.line.ngOnInit();
      this.line.chart.update();
      this.pie.exceptions = this.exceptions;
      this.pie.ngOnInit();
      this.pie.chart.update();
    }
  }

  restUsingObject() {

    this.currentTransactionalSearch = null;
    this.search = null;
    this.filterObject = {
      name: null,
      level: null,
      thread: null,
      logger: null,
      file: null,
      user: null,
      tenant: null,
      dateRange: [],
      fromTime: null,
      toTime: null
    };

    this.exceptions = this.db;
    this.line.lineData = this.lineData;
    this.line.ngOnInit();
    this.line.chart.update();
    this.pie.exceptions = this.exceptions;
    this.pie.ngOnInit();
    this.pie.chart.update();
  }

  currentTransactionalSearch: string;

  transactionalSearch(transaction: string) {
    console.log(transaction)
    if (!transaction || '' == transaction) {
      return;
    } else if (transaction === 'back') {
      this.correlationView = false;
      return;
    }
    this.search = null;
    this.currentTransactionalSearch = transaction;
    var temp;
    var tempLineData = [];
    this.exceptions = this.db.map(e => {
      const childs = [];
      var ch = e;
      while (ch != null) {
        if (transaction != (<PalmyraExceptionData>ch.exception).transaction) {
          ch = ch.child;
          continue;
        }
        tempLineData.push(ch.exception.date);
        temp = JSON.parse(JSON.stringify(ch));
        temp.child = null;
        temp.firstOccurence = temp.exception.date;
        childs.push(temp);
        ch = ch.child;
      }
      for (var i = 1; i < childs.length; ++i) {
        if (childs[i].stacktrace) {
          childs[0].exception.stacktrace = childs[i].exception.stacktrace;
          childs[0].exception.causedBy = childs[i].exception.causedBy;
        }
        childs[i - 1].child = childs[i];
      }
      var result = childs[0];
      if (result) {
        result.count = childs.length;
        result.firstOccurence = childs[0].firstOccurence;
        result.lastOccurence = childs[childs.length - 1].firstOccurence;
      }
      return result;
    }
    ).filter(e => e)
    this.correlationView = false;

    this.pie.exceptions = this.exceptions;
    this.pie.ngOnInit();
    this.pie.chart.update();
    this.line.lineData = tempLineData;
    this.line.ngOnInit();
    this.line.chart.update();
  }

  collapseAll() {
    var exceptions = document.getElementsByClassName("exception");
    for (var i = 0; i < exceptions.length; i++) {
      exceptions[i].classList.remove('show')
    }
  }

  expandAll() {
    var exceptions = document.getElementsByClassName("exception");
    for (var i = 0; i < exceptions.length; i++) {
      exceptions[i].classList.add('show')
    }
  }

  correlationIdEnabled: boolean = false;

}
