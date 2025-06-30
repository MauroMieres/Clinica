import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'nombreCompleto' })
export class NombreCompletoPipe implements PipeTransform {
  transform(persona: any): string {
    if (!persona) return '';
    return `${persona.nombre} ${persona.apellido}`;
  }
}
