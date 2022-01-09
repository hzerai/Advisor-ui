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
  constructor(private advisor: AdvisorServiceService) { }

  ngOnInit(): void {
    var saved: string = window.localStorage.getItem('savedReports');
    if (saved) {
      this.savedReports = JSON.parse(saved);
    }
  }

  fileChange(event) {
    if (event.target.files[0]) {
      this.file = event.target.files[0];
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
                  var exe = this.prepare(ex);
                  var foundEx = this.exceptions.find(e => {
                    if (e.message.trim() != 'empty' && e.message.trim() != '') {
                      const filteredArray = e.exception.causedBy.filter(value => exe.exception.causedBy.includes(value));
                      return filteredArray.length > 0;
                    }
                    return false;
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
                      window.localStorage.removeItem('savedReports')
                      savedItems = [];
                      savedItems.unshift({
                        date: new Date().toISOString(),
                        data: this.exceptions,
                        lineData: this.lineData,
                        fileName: this.log.name
                      })
                      window.localStorage.setItem('savedReports', JSON.stringify(savedItems))
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
          this.type(this.uploading);
          this.analyse();
        }
      }

    }
  }


  occurences(exception: Exception) {
    var result: ExceptionData[] = [];
    var ch: Exception = exception.child;
    result.push(exception.exception);
    while (ch != null) {
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

  analyse() {
    this.advisor.analyseLog(this.log.bytes, this.fromDate, this.toDate, this.exceptionNameFilter).subscribe(e => {
      {
        this.exceptions = [];
        this.db = [];
        e.forEach(ex => {
          var exe = this.prepare(ex);
          var foundEx = this.exceptions.find(e => {
            if (e.message.trim() != 'empty' && e.message.trim() != '') {
              const filteredArray = e.exception.causedBy.filter(value => exe.exception.causedBy.includes(value));
              return filteredArray.length > 0;
            }
            return false;
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
        window.localStorage.setItem('savedReports', JSON.stringify(savedItems))
        this.log = null;
        this.file = null;
      }
    }, err => {
      this.db = [];
      this.uploading = null;
      this.log = null;
      this.file = null;
      console.log(err)
      this.error = err.statusText;
    })


  }
  error: any;
  loadSavedReport(savedReport) {
    this.exceptions = savedReport.data;
    this.db = savedReport.data;
    this.lineData = savedReport.lineData;
    this.currentFile = savedReport.fileName;
  }


  prepare(ex: Exception) {
    ex.count = 1;
    ex.lastOccurence = ex.exception.date;
    ex.firstOccurence = ex.exception.date;
    this.lineData.push(ex.exception.date);
    ex.exception.causedBy.reverse();
    var ch: Exception = ex.child;
    var message: string = ex.exception.message;
    while (ch != null) {
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



}
