import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Exception } from '../Exception';

@Component({
  selector: 'app-bubble-chart',
  templateUrl: './bubble-chart.component.html',
  styleUrls: ['./bubble-chart.component.css']
})
export class BubbleChartComponent implements OnInit {
  @Input('exception') exception?: Exception;
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  backgroundColor = [
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
  ngOnInit(): void {

    if (this.exception == null || this.chart.data.datasets.find(e => e.label === this.exception.exception.name && e.data.length === this.exception.count)) {
      return;
    }
    var data: any = [];
    var ch: Exception = this.exception;
    while (ch != null) {
      var date = ch.exception.date;
      data.push(date);
      ch = ch.child;
    }
    this.chart.data.datasets.push({
      label: this.exception.exception.name,
      data: data,
      type: 'line',
      backgroundColor: this.backgroundColor.shift(),
      hoverBackgroundColor: 'purple',
      hoverBorderColor: 'purple',
      fill: false
    })
    this.chart.update();
  }

  public bubbleChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.5
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
      legend: { display: false },
      tooltip: {
        mode: 'index',
        enabled: false,
        position: 'nearest',
        intersect: false,
      },
    }
  };
  public bubbleChartType: ChartType = 'bubble';
  public bubbleChartLegend = true;

  public bubbleChartData: ChartData<'bubble'> = {
    labels: [],
    datasets: [],
  };

}
