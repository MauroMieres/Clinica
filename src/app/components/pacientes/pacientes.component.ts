import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaComponent } from '../historia-clinica/historia-clinica.component';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, HistoriaClinicaComponent],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
  pacientes: any[] = [];
  userId: string = '';

  verHistoriaClinica = false;
  pacienteSeleccionadoId: number | null = null;

  constructor(private supabaseService: SupabaseService) {}

  toggleHistoriaClinica(id: number) {
    if (this.pacienteSeleccionadoId === id) {
      this.verHistoriaClinica = false;
      this.pacienteSeleccionadoId = null;
    } else {
      this.verHistoriaClinica = true;
      this.pacienteSeleccionadoId = id;
    }
  }

  async ngOnInit() {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = localUser.id;

    // 1. Traer turnos del especialista logueado y finalizados
    const { data: turnos, error } = await this.supabaseService.client
      .from('turnos')
      .select('*')
      .eq('id_especialista', this.userId)
      .eq('estado', 'finalizado');

    if (error) {
      console.error('Error al traer turnos:', error);
      return;
    }
    console.log('Turnos traídos:', turnos);

    if (!turnos || !Array.isArray(turnos) || turnos.length === 0) {
      this.pacientes = [];
      return;
    }

    // 2. Agrupar turnos por id_paciente
    const pacientesMap = new Map<number, { pacienteId: number, turnos: any[] }>();
    for (const turno of turnos) {
      const pacienteId = turno.id_paciente;
      if (!pacienteId) continue;
      if (!pacientesMap.has(pacienteId)) {
        pacientesMap.set(pacienteId, { pacienteId: pacienteId, turnos: [] });
      }
      pacientesMap.get(pacienteId)!.turnos.push(turno);
    }
    // Ordenar y limitar a 3 turnos
    pacientesMap.forEach((value) => {
      value.turnos.sort((a, b) =>
        new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime()
      );
      value.turnos = value.turnos.slice(0, 3);
    });

    // 3. IDs de pacientes únicos
    const idsPacientes = Array.from(pacientesMap.keys());
    console.log('IDs únicos de pacientes:', idsPacientes);

    // 4. Traer los datos de pacientes
    const { data: datosPacientes, error: errorPacientes } = await this.supabaseService.client
      .from('pacientes')
      .select('*')
      .in('id', idsPacientes);

    if (errorPacientes) {
      console.error('Error al traer datos de pacientes:', errorPacientes);
      return;
    }
    console.log('Datos traídos de pacientes:', datosPacientes);

    // 5. Traer historias clínicas de esos pacientes, con el especialista logueado
    const { data: historiasClinicas, error: errorHistorias } = await this.supabaseService.client
      .from('historia_clinica')
      .select('*')
      .in('paciente_id', idsPacientes)
      .eq('especialista_id', this.userId);

    if (errorHistorias) {
      console.error('Error trayendo historias clínicas:', errorHistorias);
    }
    console.log('Historias clínicas encontradas:', historiasClinicas);

    // 6. Armar Map de datos de paciente
    const mapDatosPacientes = new Map<number, any>();
    (datosPacientes || []).forEach(p => mapDatosPacientes.set(p.id, p));

    // 7. Unir datos de paciente, turnos y match con historia clínica (por fecha exacta)
    this.pacientes = Array.from(pacientesMap.values()).map(p => {
      const datosPaciente = mapDatosPacientes.get(p.pacienteId);

      // Para cada turno, buscar la historia clínica asociada (por paciente, especialista y fecha)
      const turnosConHistoria = p.turnos.map(turno => {
        // Compara fecha exacta (ajustá si necesitás por solo día)
        const historia = (historiasClinicas || []).find(h =>
          h.paciente_id === turno.id_paciente &&
          h.especialista_id === turno.id_especialista &&
          h.fecha_atencion === turno.fecha_fin
        );
        return {
          ...turno,
          id_historia_clinica: historia ? historia.id : null
        };
      });

      return {
        ...datosPaciente, // puede ser undefined si no existe (poco probable)
        turnos: turnosConHistoria
      }
    });

    console.log('Pacientes finales:', this.pacientes);
  }

  // Quita turnos repetidos por fecha_fin y retorna solo los primeros únicos
obtenerTurnosUnicos(turnos: any[]) {
  const vistos = new Set();
  return turnos.filter(turno => {
    if (vistos.has(turno.fecha_fin)) return false;
    vistos.add(turno.fecha_fin);
    return true;
  });
}


turnoAbiertoId: number | null = null;

toggleHistoriaClinicaTurno(turno: any) {
  if (turno.mostrarHistoria) {
    turno.mostrarHistoria = false;
  } else {
    // Cerrar cualquier otra abierta
    (this.pacientes || []).forEach((p: any) => (p.turnos || []).forEach((t: any) => t.mostrarHistoria = false));

    turno.mostrarHistoria = true;
  }
}

}
