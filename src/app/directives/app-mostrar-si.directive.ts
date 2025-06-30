import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
@Directive({ selector: '[appMostrarSi]' })
export class MostrarSiDirective {
  private hasView = false;
  @Input() set appMostrarSi(condicion: boolean) {
    if (condicion && !this.hasView) {
      this.view.createEmbeddedView(this.tpl);
      this.hasView = true;
    } else if (!condicion && this.hasView) {
      this.view.clear();
      this.hasView = false;
    }
  }
  constructor(private tpl: TemplateRef<any>, private view: ViewContainerRef) {}
}
