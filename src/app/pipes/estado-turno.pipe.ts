import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'estadoTurno' })
export class EstadoTurnoPipe implements PipeTransform {
  transform(estado: string): string {
    switch (estado) {
      case 'solicitado': return 'Solicitado 🕒';
      case 'aceptado': return 'Aceptado ✅';
      case 'cancelado': return 'Cancelado ❌';
      case 'finalizado': return 'Finalizado ✅';
      case 'rechazado': return 'Rechazado ❌';
      default: return estado;
    }
  }
}
