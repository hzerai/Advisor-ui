import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCorrelationItemColor]'
})
export class CorrelationItemColorDirective {
  @Input('level') level: string;

  constructor(private elRef: ElementRef, private renderer: Renderer2) {

  }
  ngOnInit(): void {
    if (this.level === 'ERROR' || this.level === 'SEVERE' || this.level === 'FATAL') {
      this.renderer.addClass(this.elRef.nativeElement, 'list-group-item-danger');
    } else if (this.level === 'INFO') {
      this.renderer.addClass(this.elRef.nativeElement, 'list-group-item-info');
    } else if (this.level === 'WARNING' || this.level === 'WARN') {
      this.renderer.addClass(this.elRef.nativeElement, 'list-group-item-warning');
    } else if (this.level === 'DEBUG') {
      this.renderer.addClass(this.elRef.nativeElement, 'list-group-item-primary');
    } else if (this.level === 'TRACE') {
      this.renderer.addClass(this.elRef.nativeElement, 'list-group-item-secondary');
    }
  }
}
