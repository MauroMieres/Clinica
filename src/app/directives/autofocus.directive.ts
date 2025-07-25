import { Directive, ElementRef, AfterViewInit } from '@angular/core';
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}
  ngAfterViewInit() {
    setTimeout(() => this.el.nativeElement.focus(), 100);
  }
}
