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

let zipFile: JSZip = new JSZip();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

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

  constructor(private advisor: AdvisorServiceService) { }

  ngOnInit(): void {
    var saved: string = window.localStorage.getItem('savedReports');
    if (saved) {
      this.savedReports = JSON.parse(saved);
    }
  }
  onSelectFile(event) {
    if (event.target.files[0]) {
      this.log = {
        name: event.target.files[0].name,
        bytes: null
      }
      this.currentFile = this.log.name;
      var reader = new FileReader();
      if (this.log.name.endsWith('zip')) {
        this.uploading = 'Scanning all files contained in ' + this.log.name + ', please wait...';
        this.folderFiles = [];
        zipFile.loadAsync(event.target.files[0]).then((zip) => {
          this.exceptions = [];
          this.db = [];
          let zipSize: number = Object.keys(zip.files).length;
          Object.keys(zip.files).forEach((filename) => {
            let fn = filename.substring(filename.lastIndexOf('/') + 1);

            if (fn.trim().length != 0) {
              this.folderFiles.push({ fileName: fn, count: null });
            }
          })
          this.type(this.folderFiles.map(v => v.fileName));
          Object.keys(zip.files).forEach((filename) => {
            zip.files[filename].async('arraybuffer').then((fileData) => {

              this.advisor.analyseLog(fileData).subscribe(e => {
                zipSize--;
                e.forEach(ex => {
                  var exe = this.prepare(ex);
                  var foundEx = this.exceptions.find(e => {
                    if (e.message.trim() == 'empty' && e.message.trim() == '') {
                      const filteredArray = e.exception.causedBy.filter(value => exe.exception.causedBy.includes(value));
                      return filteredArray.length > 0;
                    } else {
                      return e.message == exe.message
                    }
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
                    this.folderFiles = null;
                  },
                    1000);

                }
              })

            });
          });

        });
      } else {
        this.uploading = 'Scanning file ' + this.log.name + ', please wait...';
        reader.readAsBinaryString(event.target.files[0])
        reader.onload = (event) => {
          this.log.bytes = event.target.result;
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
    this.advisor.analyseLog(this.log.bytes).subscribe(e => {
      {
        this.exceptions = [];
        this.db = [];
        e.forEach(ex => {
          var exe = this.prepare(ex);
          var foundEx = this.exceptions.find(e => {
            if (e.message.trim() == 'empty' && e.message.trim() == '') {
              const filteredArray = e.exception.causedBy.filter(value => exe.exception.causedBy.includes(value));
              return filteredArray.length > 0;
            } else {
              return e.message == exe.message
            }
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
      }
    })


  }

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
    text.unshift('Found files : ');
    var screen = document.getElementById('screen');
    //You have to check for lines and if the screen is an element
    if (!text || !text.length || !(screen instanceof Element)) {
      return;
    }

    //if it is not a string, you will want to make it into one
    if ('string' !== typeof text) {
      text = text.join('\n');
    }

    //normalize newlines, and split it to have a nice array
    text = text.replace(/\r\n?/g, '\n').split('');

    //the prompt is always the last child
    var prompt: any = screen.lastChild;
    prompt.className = 'typing';

    var typer = function () {
      var character = text.shift();
      screen.insertBefore(
        //newlines must be written as a `<br>`
        character === '\n'
          ? document.createElement('br')
          : document.createTextNode(character),
        prompt
      );

      //only run this again if there are letters
      if (text.length) {
        setTimeout(typer, 70);
      } else {
        prompt.className = 'idle';
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
  downloading: boolean = false;

  SavePDF() {
    this.downloading = true;

    setTimeout(() => {

    }, 1000);

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
      this.downloading = false;
    });
  }

}
