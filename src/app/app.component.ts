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
import { formatDate } from "@angular/common";
import * as XLSX from 'xlsx';

let zipFile: JSZip = new JSZip();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  date: Date = new Date();
  @ViewChild(BubbleChartComponent) bubble: BubbleChartComponent | undefined;
  @ViewChild(PieChartComponent) pie: PieChartComponent | undefined;
  @ViewChild(LineChartComponent) line: LineChartComponent | undefined;
  bubEx: Exception;
  savedReports: { date: string, data: Exception[], lineData: any, fileName: string }[];
  folderFiles: { fileName: string, count: number }[];
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
  currentFile: string;
  fromDate: any;
  fromTime: any;
  toDate: any;
  toTime: any;
  exceptionNameFilter: string;
  file: any;
  files: FileList;
  fileNb: number = 0;
  showFilter: boolean = false;

  constructor(private advisor: AdvisorServiceService) { }

  ngOnInit(): void {
    var saved: string = window.localStorage.getItem('savedReports');
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

  analyseFile() {
    if (this.fromDate) {
      this.fromDate = new Date(Date.parse(this.fromDate));
      if (this.fromTime) {
        this.fromDate.setHours(new Number(this.fromTime.split(':')[0]))
        this.fromDate.setMinutes(new Number(this.fromTime.split(':')[1]))
      }
    }
    if (this.toDate) {
      this.toDate = new Date(Date.parse(this.toDate));
      if (this.toTime) {
        this.toDate.setHours(new Number(this.toTime.split(':')[0]))
        this.toDate.setMinutes(new Number(this.toTime.split(':')[1]))
      }
    }
    if (this.file) {
      this.log = {
        name: this.file.name,
        bytes: null
      }
      this.currentFile = this.log.name;
      if (this.log.name.endsWith('zip')) {
        this.uploading = 'DEEP SCANNING ' + this.log.name + ', PLEASE HOLD...';
        this.folderFiles = [];
        zipFile.loadAsync(this.file).then((zip) => {
          this.exceptions = [];
          this.db = [];
          let zipSize: number = Object.keys(zip.files).length;
          Object.keys(zip.files).forEach((filename) => {
            let fn = filename.substring(filename.lastIndexOf('/') + 1);

            if (fn.trim().length != 0) {
              this.folderFiles.push({ fileName: fn, count: null });
            }
          })
          var text: string[] = [];
          text.push(this.uploading);
          text.push('SCAN COMPLETE')
          text.push('FOUND ' + this.folderFiles.length + ' FILES')
          text.push('PRINTING...')
          this.folderFiles.forEach(v => text.push(v.fileName))
          this.type(text);
          Object.keys(zip.files).forEach((filename) => {
            zip.files[filename].async('arraybuffer').then((fileData) => {
              this.advisor.analyseLog(fileData, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
                zipSize--;
                e.forEach(ex => {
                  var exe = this.prepare(ex, filename);
                  var foundEx = this.exceptions.find(e => {
                    // if (e.message.trim() == 'empty' || e.message.trim() == '' || e.message.trim() == 'null') {
                    //   if (e.hint && exe.hint.trim() != '' && e.todo && e.todo.trim() != '') {
                    //     return e.todo == exe.todo && e.hint == exe.hint;
                    //   } else {
                    //     return e.exception.stackTrace.includes(exe.exception.stackTrace) || exe.exception.stackTrace.includes(e.exception.stackTrace);
                    //   }
                    // } else {
                    //   return e.message.trim() == exe.message.trim();
                    // }
                    return e.key == exe.key;
                  });
                  var alreadyMapped = foundEx;
                  if (alreadyMapped) {
                    var ch = alreadyMapped.child;
                    if (ch) {
                      alreadyMapped = ch;
                      while (alreadyMapped) {
                        ch = alreadyMapped;
                        alreadyMapped = alreadyMapped.child;
                      }
                      ch.child = exe;
                    } else {
                      alreadyMapped.child = exe
                    }
                    foundEx.count = foundEx.count + exe.count;
                  } else {
                    this.exceptions.push(exe);
                    this.db.push(exe);
                  }

                })
                // this.folderFiles.find(i => i.fileName === filename).count = e.length;
                if (zipSize < 1) {
                  setTimeout(() => {
                    this.uploading = null;
                    var saved: string = window.localStorage.getItem('savedReports');
                    var savedItems: { date: string, data: Exception[], lineData: any, fileName: string }[];
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
                      fileName: this.log.name
                    })
                    try {
                      window.localStorage.setItem('savedReports', JSON.stringify(savedItems))
                    } catch (Error) {
                      try {
                        window.localStorage.removeItem('savedReports')
                        savedItems = [];
                        savedItems.unshift({
                          date: new Date().toISOString(),
                          data: this.exceptions,
                          lineData: this.lineData,
                          fileName: this.log.name
                        })
                        window.localStorage.setItem('savedReports', JSON.stringify(savedItems))
                      } catch (Error) {
                      }

                    }
                    this.log = null;
                    this.file = null;
                    this.folderFiles = null;
                  },
                    1000);
                }
              }, err => {
                this.db = [];
                this.uploading = null;
                this.log = null;
                this.file = null;
                this.folderFiles = null;
                this.error = err.statusText;
              })

            });
          });

        });
      } else {
        this.uploading = 'SCANNING FILE ' + this.log.name + ', PLEASE HOLD...';
        var reader = new FileReader();
        reader.readAsBinaryString(this.file)
        reader.onload = (event) => {
          this.log.bytes = event.target.result;
          this.log.name = this.file.name;
          this.type(this.uploading);
          this.analyse(null);
        }
      }
    } else if (this.files) {
      this.uploading = 'SCANNING Multiple files';
      this.log = {
        name: 'multiple',
        bytes: null
      }
      const text: string[] = []
      text.push('SCANNING MULTIPLE FILES, PLEASE HOLD...');
      for (var i = 0; i < this.files.length; i++) {
        var element = this.files.item(i);
        text.push(element.name);
      }
      this.type(text);
      this.fileNb = this.files.length;

      for (var i = 0; i < this.files.length; i++) {
        const element = this.files.item(i);
        var reader = new FileReader();
        reader.readAsBinaryString(element)
        reader.onload = (event) => {
          this.log.bytes = event.target.result;
          this.log.name = element.name;
          this.currentFile = element.name;
          this.exceptions = [];
          this.db = [];
          this.analyse(element.name);
        }
      }
    }
  }

  analyse(fileName) {
    this.advisor.analyseLog(this.log.bytes, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
      {
        if (!fileName) {
          this.exceptions = [];
          this.db = [];
          fileName = this.log.name;
        }
        e.forEach(ex => {
          var exe = this.prepare(ex, fileName);
          var foundEx = this.exceptions.find(e => {
            return e.key == exe.key;
          });
          var alreadyMapped = foundEx;
          if (alreadyMapped) {
            var ch = alreadyMapped.child;
            if (ch) {
              alreadyMapped = ch;
              while (alreadyMapped) {
                ch = alreadyMapped;
                alreadyMapped = alreadyMapped.child;
              }
              ch.child = exe;
            } else {
              alreadyMapped.child = exe
            }
            foundEx.count = foundEx.count + exe.count;
          } else {
            this.exceptions.push(exe);
            this.db.push(exe);
          }

        })
        this.fileNb--;
        if (this.fileNb <= 0) {
          var fileNames: string = this.log.name;
          if (this.files) {
            for (var i = 0; i < this.files.length; i++) {
              var element = this.files.item(i);
              fileNames = fileNames + '_' + element.name;
            }
          }
          var saved: string = window.localStorage.getItem('savedReports');
          var savedItems: { date: string, data: Exception[], lineData: any, fileName: string }[];
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
            fileName: fileNames
          })
          try {
            window.localStorage.setItem('savedReports', JSON.stringify(savedItems))
          } catch (Error) {
            console.log(Error)
          }
          this.uploading = null;
          this.log = null;
          this.file = null;
          this.files = null;
        }
      }
    }, err => {
      this.db = [];
      this.uploading = null;
      this.log = null;
      this.file = null;
      this.files = null;
      console.log(err)
      this.error = err.statusText;
    })
  }


  occurences(exception: Exception) {
    var result: ExceptionData[] = [];
    var ch: Exception = exception.child;
    exception.exception.logFile = exception.logFile;
    result.push(exception.exception);
    while (ch != null) {
      ch.exception.logFile = ch.logFile;
      result.unshift(ch.exception);
      ch = ch.child;
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
  }


  prepare(ex: Exception, fileName: string) {
    console.log(fileName)
    ex.logFile = fileName;
    ex.count = 1;
    ex.lastOccurence = ex.exception.date;
    ex.firstOccurence = ex.exception.date;
    this.lineData.push(ex.exception.date);
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
    this.bubble.exception = event;
    this.bubble.ngOnInit();
  }

  type(text) {
    setTimeout(() => {
      var screen = document.getElementById('screen');
      if (!text || !text.length || !(screen instanceof Element)) {
        return;
      }
      if ('string' !== typeof text) {
        text = text.join('\n');
      }

      text = text.replace(/\r\n?/g, '\n').split('');
      var prompt: any = screen.lastChild;
      prompt.className = 'idle';

      const typer = function () {
        var character = text.shift();
        screen.insertBefore(
          character === '\n'
            ? document.createElement('br')
            : document.createTextNode(character),
          prompt
        );
        if (text.length) {
          setTimeout(typer, 10);
        }
      };
      setTimeout(typer, 100);
    }, 500);

  };

  getClippedRegion(image, x, y, width, height) {

    var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    //                   source region         dest. region
    ctx.drawImage(image, x, y, width, 2730, 0, 0, width, 2730);

    return canvas;
  }
  downloading: string;

  SavePDF() {
    this.downloading = 'pdf';

    setTimeout(() => {
      var exceptions = document.getElementsByClassName("exception");
      for (var i = 0; i < exceptions.length; i++) {
        exceptions[i].classList.remove('collapse')
      }

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
        for (var i = 0; i < exceptions.length; i++) {
          exceptions[i].classList.add('collapse')
        }
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
  filterObject: { name: string, level: string, thread: string, logger: string, file: string, fromDate: Date, toDate: Date } = {
    name: null,
    level: null,
    thread: null,
    logger: null,
    file: null,
    fromDate: null,
    toDate: null
  }
  initFilter() {
    if (!this.filterNames) {
      const names = [];
      const threads = [];
      const loggers = [];
      const levels = [];
      const files = [];
      this.db.forEach(exception => {
        let ch = exception;
        while (ch != null) {
          names.push(ch.exception.name)
          files.push(ch.logFile)
          levels.push(ch.exception.level)
          threads.push(ch.exception.thread)
          loggers.push(ch.exception.logger)
          ch = ch.child;
        }
      })

      this.filterNames = Array.from(new Set(names));
      this.filterFiles = Array.from(new Set(files));
      this.filterThreads = Array.from(new Set(threads));
      this.filterLevels = Array.from(new Set(levels));
      this.filterLoggers = Array.from(new Set(loggers));
    }

  }

  filterUsingObject() {
    let name = this.filterObject.name;
    let file = this.filterObject.file;
    let thread = this.filterObject.thread;
    let level = this.filterObject.level;
    let logger = this.filterObject.logger;
    let fromDate = this.filterObject.fromDate;
    let toDate = this.filterObject.toDate;
    if ((file && file != 'null') || (name && name != 'null') || (thread && thread != 'null') || (level && level != 'null') || (logger && logger != 'null') || fromDate || toDate) {
      var tempLineData = [];
      this.exceptions = this.db.map(e => {

        let childs = [];
        let ch = e;
        while (ch != null) {
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
          tempLineData.push(ch.exception.date);
          childs.push(ch);
          ch = ch.child;
        }
        for (var i = 1; i < childs.length; ++i) {
          childs[i - 1].child = childs[i];
        }
        return childs[0];
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

    this.filterObject = {
      name: null,
      level: null,
      thread: null,
      logger: null,
      file: null,
      fromDate: null,
      toDate: null
    };

    this.exceptions = this.db;
    this.line.lineData = this.lineData;
    this.line.ngOnInit();
    this.line.chart.update();
    this.pie.exceptions = this.exceptions;
    this.pie.ngOnInit();
    this.pie.chart.update();
  }
}
