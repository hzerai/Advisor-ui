import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { formatDate } from "@angular/common";
import DatalabelsPlugin from 'chartjs-plugin-datalabels';

const COLORS = [
  'red',
  'green',
  'blue',
  'yellow',
  'brown',
  'magenta',
  'cyan',
  'orange',
  'pink',
  'black'
];
@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements OnInit {
  @Input('lineData') lineData: Date[];
  public label: string;


  ngOnInit(): void {
    if (this.lineData.length == 0) {
      return;
    }
    // this.chart.options.plugins.legend.display = false;
    var data: { date: Date, count: number }[] = [];
    this.lineData?.forEach(date => {
      var temp = new Date(date);
      temp.setMilliseconds(0);
      temp.setSeconds(0);
      temp.setMinutes(0);
      var fill = data.find(s => s.date.toString() === temp.toString());
      if (fill) {
        fill.count = fill.count + 1;
      } else {
        data.push({
          date: temp,
          count: 1
        })
      }
    })
    this.lineChartData.labels = [];
    this.lineChartData.datasets = [{
      type: 'line',
      data: [],
      backgroundColor: this.getBGC,
      hoverBackgroundColor: this.getBGC,
      hoverBorderWidth: 2,
      hoverBorderColor: 'cyan'
    }];
    if (!this.label) {
      const delayBetweenPoints = data.length > 10 ? 100 : 300;
      const previousY = (ctx) => ctx.index === 0 ? ctx.chart.scales.y.getPixelForValue(100) : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;
      const animation: any = {
        x: {
          type: 'number',
          easing: 'linear',
          duration: delayBetweenPoints,
          from: NaN, // the point is initially skipped
          delay(ctx) {
            if (ctx.type !== 'data' || ctx.xStarted) {
              return 0;
            }
            ctx.xStarted = true;
            return ctx.index * delayBetweenPoints;
          }
        },
        y: {
          type: 'number',
          easing: 'linear',
          duration: delayBetweenPoints,
          from: previousY,
          delay(ctx) {
            if (ctx.type !== 'data' || ctx.yStarted) {
              return 0;
            }
            ctx.yStarted = true;
            return ctx.index * delayBetweenPoints;
          }
        }
      };
      this.lineChartOptions = {
        animation,
        elements: {
          line: {
            tension: 0.4
          }
        },
        scales: {
          xy: {

          }
        },
        interaction: {
          axis: 'xy',
          mode: 'nearest'
        },
        plugins: {
          title: {
            display: true,
            text: 'Timeline',
          },
          legend: { display: true },
          tooltip: {
            mode: 'index',
            enabled: false,
            position: 'nearest',
            external: this.externalTooltipHandler,
            intersect: false,
          },
        }
      };
    }
    if (data.length > 2) {
      this.lineChartData.datasets[0].type = 'line';
    } else {
      this.lineChartData.datasets[0].type = 'bar';
    }
    if (this.label) {
      this.lineChartData.datasets[0].label = this.label;
    } else {
      this.lineChartOptions.plugins.legend.display = false;
    }
    data.sort((b, a) => {
      var first = a.date == null ? 0 : new Date(a.date).getTime();
      var second = b.date == null ? 0 : new Date(b.date).getTime();
      return second - first;
    }).forEach(d => {
      this.lineChartData.labels.push(formatDate(d.date, 'dd MMM H:mm', 'en'));
      this.lineChartData.datasets[0].data.push(d.count);
    })
  }

  public getBGC(context) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return null;
    }
    let width, height, gradient;
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (gradient === null || width !== chartWidth || height !== chartHeight) {
      // Create the gradient because this is either the first render
      // or the size of the chart has changed
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0, '#bab520');
      gradient.addColorStop(0.3, 'orange');
      gradient.addColorStop(1, '#ff3838');
    }
    return gradient;
  }

  public getLineBGC(context) {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return null;
    }
    let width, height, gradient;
    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (gradient === null || width !== chartWidth || height !== chartHeight) {
      // Create the gradient because this is either the first render
      // or the size of the chart has changed
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0, 'yellow');
      gradient.addColorStop(0.3, '#ed6051');
      gradient.addColorStop(1, 'red');
    }
    return gradient;
  }

  public lineChartData: ChartConfiguration['data'] = {
    datasets: null,
    labels: null
  };



  getOrCreateTooltip = (chart) => {
    let tooltipEl = chart.canvas.parentNode.querySelector('div');

    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
      tooltipEl.style.borderRadius = '3px';
      tooltipEl.style.color = 'white';
      tooltipEl.style.opacity = 1;
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, 0)';
      tooltipEl.style.transition = 'all .1s ease';

      const table = document.createElement('table');
      table.style.margin = '0px';

      tooltipEl.appendChild(table);
      chart.canvas.parentNode.appendChild(tooltipEl);
    }

    return tooltipEl;
  };

  externalTooltipHandler = (context) => {
    // Tooltip Element
    const { chart, tooltip } = context;
    const tooltipEl = this.getOrCreateTooltip(chart);

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    // Set Text
    if (tooltip.body) {
      const titleLines = tooltip.title || [];
      const bodyLines = tooltip.body.map(b => b.lines);

      const tableHead = document.createElement('thead');

      titleLines.forEach(title => {
        const tr = document.createElement('tr');
        tr.style.borderWidth = '0';

        const th = document.createElement('th');
        th.style.borderWidth = '0';
        let fromDate = new Date(Date.parse(title));
        let toDate = new Date();
        toDate.setHours(fromDate.getHours() + 1)
        let txt = bodyLines[0] + ' Exceptions between ' + fromDate.getHours() + 'H and ' + toDate.getHours() + 'H ' + formatDate(toDate, 'MMM dd', 'en');
        const text = document.createTextNode(txt);

        th.appendChild(text);
        tr.appendChild(th);
        tableHead.appendChild(tr);
      });

      const tableBody = document.createElement('tbody');


      const tableRoot = tooltipEl.querySelector('table');

      // Remove old children
      while (tableRoot.firstChild) {
        tableRoot.firstChild.remove();
      }

      // Add new children
      tableRoot.appendChild(tableHead);
      tableRoot.appendChild(tableBody);
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

    // Display, position, and set styles for font
    tooltipEl.style.opacity = 0.7;
    tooltipEl.style.left = positionX + tooltip.caretX + 'px';
    tooltipEl.style.top = positionY + tooltip.caretY + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding = 5 + 'px ' + 5 + 'px';
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.2
      }
    },
    scales: {
      xy: {

      }
    },
    interaction: {
      axis: 'xy',
      mode: 'nearest'
    },
    plugins: {
      title: {
        display: true,
        text: 'Select an exception for the pie chart to show it here',
      },
      legend: { display: true },
      tooltip: {
        mode: 'index',
        enabled: false,
        position: 'nearest',
        external: this.externalTooltipHandler,
        intersect: false,
      },
    }
  };

  public lineChartPlugins = null;

  public lineChartType: ChartType = 'line';

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;



}
