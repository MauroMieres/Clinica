import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaComponent } from '../historia-clinica/historia-clinica.component';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule,HistoriaClinicaComponent],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
  pacientes: any[] = [];
  userId: string = '';

    verHistoriaClinica = false;
pacienteSeleccionadoId: number | null = null;

toggleHistoriaClinica(id: number) {
  if (this.pacienteSeleccionadoId === id) {
    this.verHistoriaClinica = false;
    this.pacienteSeleccionadoId = null;
  } else {
    this.verHistoriaClinica = true;
    this.pacienteSeleccionadoId = id;
  }
}

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  this.userId = localUser.id;

  // Traer turnos finalizados del especialista
  const { data: turnos, error } = await this.supabaseService.client
    .from('turnos')
    .select(`
      id_paciente,
      estado,
      pacientes (id, nombre, apellido, email, dni, edad, foto1_url, foto2_url, obra_social)
    `)
    .eq('id_especialista', this.userId)
    .eq('estado', 'finalizado');

  const pacientesMap = new Map<string, any>();

  // Validar historia clínica por paciente
  for (const turno of turnos || []) {
    const paciente = turno.pacientes && Array.isArray(turno.pacientes) ? turno.pacientes[0] : turno.pacientes;
    if (paciente && paciente.id && !pacientesMap.has(paciente.id)) {
      const { data: historia } = await this.supabaseService.client
        .from('historia_clinica')
        .select('id')
        .eq('paciente_id', paciente.id)
        .limit(1);

      if (historia && historia.length > 0) {
        pacientesMap.set(paciente.id, paciente);
      }
    }
  }

  this.pacientes = Array.from(pacientesMap.values());
  console.log('Pacientes atendidos con historia clínica:', this.pacientes);
}


}
