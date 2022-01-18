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
    var names: {name : string, count : number}[] = [];
    this.exceptions?.forEach(e => {
     var i = names.find(i => i.name == e.exception.name)
     if(i){
      i.count = i.count + e.count;
     } else {
      names.push({
        name : e.exception.name,
        count : e.count
      })
     }
    })
    this.pieChartData.labels = names.map(i => i.name);
    this.pieChartData.datasets[0].data = names.map(i => i.count);
  }

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [] }]
  };

  public pieChartType: ChartType = 'pie';
  public pieChartPlugins = [DatalabelsPlugin];

  public chartClicked(event): void {
    var eName = this.pieChartData.labels[event.active[0].index];
    this.ex.emit(this.exceptions.filter(e => e.exception.name === eName)[0]);
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
      const p = document.createElement('p');
      p.style.margin = '0px';
      tooltipEl.appendChild(p);
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
      const title = tooltip.dataPoints[0].label + ' occured ' + tooltip.dataPoints[0].formattedValue + ' times.';
      const text = document.createTextNode(title);
      const p = tooltipEl.querySelector('p');
      while (p.firstChild) {
        p.firstChild.remove();
      }
      p.appendChild(text);
    }
    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
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
      },
      legend: {
        display: true,
        position: 'bottom',
        maxHeight : 180,
      },
    }
  };
}
