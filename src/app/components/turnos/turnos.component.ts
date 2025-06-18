import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-turnos',
  imports: [CommonModule,FormsModule],
  templateUrl: './turnos.component.html',
  styleUrls: ['./turnos.component.css']
})
export class TurnosComponent implements OnInit {
  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  filtroEspecialidad: string = '';
  filtroEspecialista: string = '';

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    // Chequear rol admin (opcional)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol !== 'admin') {
      Swal.fire('Acceso denegado', 'No tenés permiso para ver los turnos de la clínica.', 'error');
      return;
    }

    await this.cargarTurnos();
  }

  async cargarTurnos() {
    const { data, error } = await this.supabaseService.client
  .from('turnos')
  .select(`
    *,
    especialistas (nombre, apellido),
    especialidades (nombre),
    pacientes (nombre, apellido)
  `)
  .order('fecha_inicio', { ascending: true });

    if (!error) {
      this.turnos = data || [];
      this.turnosFiltrados = [...this.turnos];
    }
  }

  filtrarTurnos() {
    const esp = this.filtroEspecialidad.trim().toLowerCase();
    const especialista = this.filtroEspecialista.trim().toLowerCase();

    this.turnosFiltrados = this.turnos.filter(turno => {
      const nombreEspecialidad = turno.especialidades?.nombre?.toLowerCase() || '';
      const nombreEspecialista = (turno.especialistas?.nombre + ' ' + turno.especialistas?.apellido).toLowerCase();

      const coincideEspecialidad = !esp || nombreEspecialidad.includes(esp);
      const coincideEspecialista = !especialista || nombreEspecialista.includes(especialista);

      return coincideEspecialidad && coincideEspecialista;
    });
  }

  async cancelarTurno(turno: any) {
    // Solo si el turno NO fue aceptado, finalizado(realizado) ni rechazado
    if (['aceptado', 'finalizado', 'realizado', 'rechazado'].includes(turno.estado)) {
      Swal.fire('No se puede cancelar', 'Este turno no puede ser cancelado.', 'info');
      return;
    }

    const { value: comentario } = await Swal.fire({
      title: 'Motivo de cancelación',
      input: 'textarea',
      inputLabel: 'Ingrese el motivo de la cancelación',
      inputPlaceholder: 'Escriba aquí el motivo...',
      showCancelButton: true,
      confirmButtonText: 'Cancelar Turno',
      cancelButtonText: 'Volver'
    });

    if (!comentario || !comentario.trim()) {
      Swal.fire('Debe ingresar un comentario para cancelar el turno.', '', 'warning');
      return;
    }

    const { error } = await this.supabaseService.client
      .from('turnos')
      .update({ estado: 'cancelado', nota_cancelacion: comentario })
      .eq('id', turno.id);

    if (!error) {
      Swal.fire('Turno cancelado', 'El turno fue cancelado correctamente.', 'success');
      this.cargarTurnos();
    } else {
      Swal.fire('Error', 'No se pudo cancelar el turno.', 'error');
    }
  }
}
