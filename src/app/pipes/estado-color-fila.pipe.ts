import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'estadoColorFila' })
export class EstadoColorFilaPipe implements PipeTransform {
  transform(estado: string): string {
    if (!estado) return '';
    estado = estado.trim().toLowerCase();
    switch (estado) {
      case 'solicitado': return '#fff9c4';     // Amarillo pastel
      case 'rechazado':
      case 'cancelado': return '#ffcdd2';      // Rojo pastel
      case 'finalizado': return '#c8e6c9';     // Verde pastel
      default: return '';
    }
  }
}
