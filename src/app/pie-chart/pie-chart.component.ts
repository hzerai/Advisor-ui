import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import DatalabelsPlugin from 'chartjs-plugin-datalabels';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Exception } from '../Exception';

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements OnInit {
  @Input('exceptions') exceptions: Exception[];
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @Output() ex = new EventEmitter<Exception>();

  ngOnInit(): void {

    var data: number[] = [];
    var names: string[] = [];
    this.exceptions?.forEach(e => {
      names.push(e.exception.name);
      data.push(e.count);
    })
    this.pieChartData.labels = names;
    this.pieChartData.datasets[0].data = data;

  }

  // handleHover(evt, item, legend) {
  //   legend.chart.data.datasets[0].backgroundColor.forEach((color, index, colors) => {
  //     colors[index] = index === item.index || color.length === 9 ? color : color + '4D';
  //   });
  //   legend.chart.update();
  // }
  // handleLeave(evt, item, legend) {
  //   legend.chart.data.datasets[0].backgroundColor.forEach((color, index, colors) => {
  //     colors[index] = color.length === 9 ? color.slice(0, -2) : color;
  //   });
  //   legend.chart.update();
  // }
  // Pie

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [] } ]
  };
  public pieChartType: ChartType = 'pie';
  public pieChartPlugins = [DatalabelsPlugin];

  public chartClicked(event): void {
    var eName = this.pieChartData.labels[event.active[0].index];
    var ecount = this.pieChartData.datasets[0].data[event.active[0].index];
    this.ex.emit(this.exceptions.filter(e => e.exception.name === eName && e.count)[0]);
  }


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
    const { chart, tooltip } = context;
    const tooltipEl = this.getOrCreateTooltip(chart);
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }
    if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
      const tableHead = document.createElement('thead');
      const title = tooltip.dataPoints[0].label + ' occured ' + tooltip.dataPoints[0].formattedValue + ' times.';
      const tr = document.createElement('tr');
      tr.style.borderWidth = '0';
      const th = document.createElement('th');
      th.style.borderWidth = '0';
      const text = document.createTextNode(title);
      th.appendChild(text);
      tr.appendChild(th);
      tableHead.appendChild(tr);

      const tableBody = document.createElement('tbody');


      const tableRoot = tooltipEl.querySelector('table');

      while (tableRoot.firstChild) {
        tableRoot.firstChild.remove();
      }

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

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Counts',
      },
      tooltip: {
        mode: 'index',
        enabled: false,
        position: 'nearest',
        external: this.externalTooltipHandler,
        intersect: false,
      },
      legend: {
        display: true,
        position: 'top',
        // onHover: this.handleHover,
        // onLeave: this.handleLeave
      },
    }
  };
}
