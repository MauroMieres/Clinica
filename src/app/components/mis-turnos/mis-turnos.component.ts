import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.css']
})
export class MisTurnosComponent implements OnInit {
  turnos: any[] = [];
  userId: string = '';
  userRole: string = '';

  modoSolicitud = false;
  modoBusqueda: 'especialidad' | 'especialista' = 'especialidad';

  especialidades: any[] = [];
  especialistas: any[] = [];

  especialistasFiltrados: any[] = [];
  especialidadesFiltradas: any[] = [];

  especialidadSeleccionada: number | null = null;
  especialistaSeleccionado: number | null = null;

  horariosDisponibles: any[] = [];
  horarioSeleccionado: any = null;

  diasSemana: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  this.userId = localUser.id;
  this.userRole = localUser.rol;

  if (this.userRole === 'paciente') {
    await this.cargarTurnosPaciente();
  } else if (this.userRole === 'especialista') {
    await this.cargarTurnosEspecialista();
  }
}

async cargarTurnosEspecialista() {
  const { data, error } = await this.supabaseService.client
    .from('turnos')
    .select(`
      *,
      pacientes (
        nombre,
        apellido
      ),
      especialidades (
        nombre
      )
    `)
    .eq('id_especialista', this.userId)
    .order('fecha_inicio', { ascending: true });

  if (error) {
    console.error('Error al cargar turnos del especialista:', error);
  } else {
    this.turnos = data || [];
  }
}

  async cargarTurnosPaciente() {
   const { data, error } = await this.supabaseService.client
  .from('turnos')
  .select(`
    *,
    especialistas (
      nombre
    ),
    especialidades (
      nombre
    )
  `)
  .eq('id_paciente', this.userId)
  .order('fecha_inicio', { ascending: true });


    if (error) {
      console.error('Error al cargar turnos:', error);
    } else {
      this.turnos = data || [];
    }
  }

  async cancelarTurno(turno: any) {
    const nota = prompt('Ingrese el motivo de la cancelación:');
    if (!nota) {
      alert('Debe ingresar una nota para cancelar el turno.');
      return;
    }

    const { error } = await this.supabaseService.client
      .from('turnos')
      .update({ estado: 'cancelado', nota_cancelacion: nota })
      .eq('id', turno.id);

    if (error) {
      console.error('Error al cancelar turno:', error);
    } else {
      this.cargarTurnosPaciente();
    }
  }

  async abrirSolicitud() {
    this.modoSolicitud = true;

    const [especialidadesRes, especialistasRes] = await Promise.all([
      this.supabaseService.client.from('especialidades').select('*'),
      this.supabaseService.client.from('especialistas').select('*')
    ]);

    this.especialidades = especialidadesRes.data || [];
    this.especialistas = especialistasRes.data || [];
  }

 async cargarEspecialistasPorEspecialidad() {
  const { data } = await this.supabaseService.client
    .from('especialista_especialidad')
    .select('especialista_id') // ✅ campo correcto
    .eq('especialidad_id', this.especialidadSeleccionada); // ✅ campo correcto

  const ids = data?.map(e => e.especialista_id) || [];
  this.especialistasFiltrados = this.especialistas.filter(e => ids.includes(e.id));
}

 async cargarEspecialidadesPorEspecialista() {
  const { data } = await this.supabaseService.client
    .from('especialista_especialidad')
    .select('especialidad_id') // ✅ campo correcto
    .eq('especialista_id', this.especialistaSeleccionado); // ✅ campo correcto

  const ids = data?.map(e => e.especialidad_id) || [];
  this.especialidadesFiltradas = this.especialidades.filter(e => ids.includes(e.id));
}

 async cargarHorariosDisponibles() {
  const { data: horariosRaw } = await this.supabaseService.client
    .from('horarios_atencion')
    .select('*')
    .eq('especialista_id', this.especialistaSeleccionado)
    .eq('especialidad_id', this.especialidadSeleccionada);

  const horarios = horariosRaw || [];

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 15);

  const { data: turnosOcupadosRaw } = await this.supabaseService.client
    .from('turnos')
    .select('fecha_inicio')
    .eq('id_especialista', this.especialistaSeleccionado)
    .eq('id_especialidad', this.especialidadSeleccionada)
    .eq('estado', 'solicitado');

  const ocupados = (turnosOcupadosRaw || []).map(t => {
  const fecha = new Date(t.fecha_inicio);
  return fecha.getFullYear() + '-' +
         String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
         String(fecha.getDate()).padStart(2, '0') + ' ' +
         String(fecha.getHours()).padStart(2, '0') + ':' +
         String(fecha.getMinutes()).padStart(2, '0') + ':00';
});

  const posiblesTurnos: any[] = [];
  const hoy = new Date();

  for (let i = 0; i <= 15; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + i);
    const dia = this.diasSemana[fecha.getDay()];

    const horariosDelDia = horarios.filter(h => h.dia_semana === dia && h.activo);

    for (const h of horariosDelDia) {
      const [hInicioHoras, hInicioMin] = h.hora_inicio.split(":").map(Number);
      const [hFinHoras, hFinMin] = h.hora_fin.split(":").map(Number);

      const inicio = new Date(fecha);
      inicio.setHours(hInicioHoras, hInicioMin, 0, 0);

      const fin = new Date(fecha);
      fin.setHours(hFinHoras, hFinMin, 0, 0);

      while (inicio < fin) {
        const turnoFin = new Date(inicio.getTime() + h.duracion_turno * 60000);

        const isoInicio = inicio.getFullYear() + '-' +
          String(inicio.getMonth() + 1).padStart(2, '0') + '-' +
          String(inicio.getDate()).padStart(2, '0') + ' ' +
          String(inicio.getHours()).padStart(2, '0') + ':' +
          String(inicio.getMinutes()).padStart(2, '0') + ':00';

        const isoFin = turnoFin.getFullYear() + '-' +
          String(turnoFin.getMonth() + 1).padStart(2, '0') + '-' +
          String(turnoFin.getDate()).padStart(2, '0') + ' ' +
          String(turnoFin.getHours()).padStart(2, '0') + ':' +
          String(turnoFin.getMinutes()).padStart(2, '0') + ':00';

        if (!ocupados.includes(isoInicio) && turnoFin <= fin) {
          posiblesTurnos.push({
            fecha_inicio: isoInicio,
            fecha_fin: isoFin
          });
        }

        inicio.setMinutes(inicio.getMinutes() + h.duracion_turno);
      }
    }
  }

  this.horariosDisponibles = posiblesTurnos;
}


  async confirmarTurno() {

    if (!this.horarioSeleccionado?.fecha_inicio || !this.horarioSeleccionado?.fecha_fin) {
  alert('Debe seleccionar un horario válido.');
  return;
}


    console.log('Turno a insertar:', {
  id_paciente: this.userId,
  id_especialista: this.especialistaSeleccionado,
  id_especialidad: this.especialidadSeleccionada,
  ...this.horarioSeleccionado
});

   const { error } = await this.supabaseService.client.from('turnos').insert([{
  id_paciente: this.userId,
  id_especialista: this.especialistaSeleccionado,
  id_especialidad: this.especialidadSeleccionada,
  fecha_inicio: this.horarioSeleccionado.fecha_inicio,
  fecha_fin: this.horarioSeleccionado.fecha_fin,
  estado: 'solicitado'
}]);


    if (error) {
      alert('Hubo un error al confirmar el turno');
      console.error(error);
    } else {
      alert('Turno solicitado con éxito');
      this.modoSolicitud = false;
      this.cargarTurnosPaciente();
    }
  }
}
