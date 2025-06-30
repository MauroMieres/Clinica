import { Directive, ElementRef, HostListener, Input } from '@angular/core';
@Directive({ selector: '[appBotonHover]' })
export class BotonHoverDirective {
  @Input() appBotonHover: string = '#17a2b8'; // color default

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.el.nativeElement.style.backgroundColor = this.appBotonHover;
  }
  @HostListener('mouseleave') onMouseLeave() {
    this.el.nativeElement.style.backgroundColor = '';
  }
}
