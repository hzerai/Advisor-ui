import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[level-color]'
})
export class LevelColor implements OnInit {
  @Input('level') level: string;

  constructor(private elRef: ElementRef, private renderer: Renderer2) {

  }
  ngOnInit(): void {
    if (this.level === 'ERROR' || this.level === 'SEVERE' || this.level === 'FATAL') {
      this.renderer.addClass(this.elRef.nativeElement, 'bg-danger');
      this.renderer.addClass(this.elRef.nativeElement, 'text-white');
    } else if (this.level === 'INFO') {
      this.renderer.addClass(this.elRef.nativeElement, 'bg-success');
      this.renderer.addClass(this.elRef.nativeElement, 'text-white');
    } else if (this.level === 'WARNING') {
      this.renderer.addClass(this.elRef.nativeElement, 'bg-warning');
      this.renderer.addClass(this.elRef.nativeElement, 'text-dark');
    } else if (this.level === 'DEBUG') {
      this.renderer.addClass(this.elRef.nativeElement, 'bg-info');
      this.renderer.addClass(this.elRef.nativeElement, 'text-white');
    }
  }

}
