import { Component } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitar-turnos',
  imports: [CommonModule,FormsModule],
  templateUrl: './solicitar-turnos.component.html',
  styleUrl: './solicitar-turnos.component.css'
})
export class SolicitarTurnosComponent {

 turnos: any[] = [];
  userId: string = '';
 userRole: 'paciente' | 'especialista' | 'admin' | '' = '';

  filtroEspecialidadId: number | null = null;
filtroEspecialidadTexto: string = '';
filtroNombreEspecialista: string = '';

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

  pacientes: any[] = [];
pacienteSeleccionadoPorAdmin: string | null = null;

async cargarPacientes() {
  const { data, error } = await this.supabaseService.client.from('pacientes').select('id, nombre, apellido');
  if (!error) {
    this.pacientes = data;
  }
}


  diasSemana: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor(private supabaseService: SupabaseService) {}

async ngOnInit() {
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  this.userId = localUser.id;
  this.userRole = localUser.rol;

  // Solo permite si es paciente o admin
  if (this.userRole !== 'paciente' && this.userRole !== 'admin') {
    Swal.fire('Acceso denegado', 'No tenés permiso para solicitar turnos.', 'error');
    return;
  }

  if (this.userRole === 'paciente') {
    await this.cargarTurnosPaciente();
  } else if (this.userRole === 'admin') {
    await this.cargarPacientes();
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
    await this.cargarEspecialidadesParaFiltro();
    this.filtrarTurnosPorEspecialidad(); // aplicar filtro al inicio
  }
}


  async cargarTurnosPaciente() {
   const { data, error } = await this.supabaseService.client
  .from('turnos')
  .select(`
  *,
  especialistas (
    nombre,
    apellido
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
      this.turnosFiltrados = [...this.turnos];

    }
  }

 async cancelarTurno(turno: any) {
  if(turno.estado === 'finalizado') {
    await Swal.fire({
      icon: 'error',
      title: 'No se puede cancelar un turno finalizado.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { value: nota } = await Swal.fire({
    title: 'Motivo de cancelación',
    input: 'textarea',
    inputLabel: 'Ingrese el motivo de la cancelación',
    inputPlaceholder: 'Escriba aquí el motivo...',
    inputAttributes: {
      'aria-label': 'Escriba aquí el motivo'
    },
    showCancelButton: true,
    confirmButtonText: 'Cancelar Turno',
    cancelButtonText: 'Volver'
  });

  if (!nota || !nota.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Debe ingresar una nota para cancelar el turno.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'cancelado', nota_cancelacion: nota })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo cancelar el turno',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno cancelado correctamente.',
      confirmButtonText: 'Ok'
    });
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

  // Importante: buscar turnos ya reservados en este horario/especialista/especialidad
  const { data: turnosOcupadosRaw } = await this.supabaseService.client
    .from('turnos')
    .select('fecha_inicio')
    .eq('id_especialista', this.especialistaSeleccionado)
    .eq('id_especialidad', this.especialidadSeleccionada)
    .in('estado', ['solicitado', 'aceptado', 'finalizado']); // filtrá los ocupados en todos estos estados

  // Lista de fechas ocupadas en formato "YYYY-MM-DD HH:mm:00"
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

        // 💡 Solo agregar si NO está ocupado
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
    await Swal.fire({
      icon: 'warning',
      title: 'Debe seleccionar un horario válido.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  // Si es admin, debe seleccionar paciente
  let pacienteId = this.userId;
  if (this.userRole === 'admin') {
    if (!this.pacienteSeleccionadoPorAdmin) {
      await Swal.fire('Debés seleccionar un paciente', '', 'warning');
      return;
    }
    pacienteId = this.pacienteSeleccionadoPorAdmin;
  }

  // Validar que no haya doble turno reservado (como antes)
  const { data: turnosExistentes } = await this.supabaseService.client
    .from('turnos')
    .select('id')
    .eq('id_especialista', this.especialistaSeleccionado)
    .eq('id_especialidad', this.especialidadSeleccionada)
    .eq('fecha_inicio', this.horarioSeleccionado.fecha_inicio)
    .in('estado', ['solicitado', 'aceptado', 'finalizado']);

  if (turnosExistentes && turnosExistentes.length > 0) {
    await Swal.fire({
      icon: 'error',
      title: 'Ese turno ya fue reservado por otro paciente.',
      confirmButtonText: 'Ok'
    });
    this.modoSolicitud = false;
    await this.cargarTurnosPaciente();
    return;
  }

  // Insertar el turno
  const { error } = await this.supabaseService.client.from('turnos').insert([{
    id_paciente: pacienteId,
    id_especialista: this.especialistaSeleccionado,
    id_especialidad: this.especialidadSeleccionada,
    fecha_inicio: this.horarioSeleccionado.fecha_inicio,
    fecha_fin: this.horarioSeleccionado.fecha_fin,
    estado: 'solicitado'
  }]);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Hubo un error al confirmar el turno',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno solicitado con éxito',
      confirmButtonText: 'Ok'
    });
    // Limpiar los campos del formulario
    this.especialidadSeleccionada = null;
    this.especialistaSeleccionado = null;
    this.horarioSeleccionado = null;
    this.horariosDisponibles = [];
    this.modoBusqueda = 'especialidad'; // Opcional
    this.modoSolicitud = false;
    if (this.userRole === 'paciente') {
      await this.cargarTurnosPaciente();
    }
  }
}


async cargarEspecialidadesParaFiltro() {
  // Extraer especialidades únicas de los turnos cargados
  const unique = new Map();
  this.turnos.forEach(t => {
    if (t.especialidades) {
      unique.set(t.id_especialidad, t.especialidades.nombre);
    }
  });

  this.especialidades = Array.from(unique.entries()).map(([id, nombre]) => ({ id, nombre }));
}

turnosFiltrados: any[] = [];
filtroNombrePaciente: string = '';


filtrarTurnosPorEspecialidad() {
  const textoEspecialidad = this.filtroEspecialidadTexto.trim().toLowerCase();
  const textoPaciente = this.filtroNombrePaciente.trim().toLowerCase();
  const textoEspecialista = this.filtroNombreEspecialista.trim().toLowerCase();

  this.turnosFiltrados = this.turnos.filter(t => {
    const nombreEsp = t.especialidades?.nombre?.toLowerCase() || '';
    const nombrePaciente = (t.pacientes?.nombre + ' ' + t.pacientes?.apellido).toLowerCase();
    const nombreEspecialista = (t.especialistas?.nombre + ' ' + t.especialistas?.apellido).toLowerCase();

    const coincideEspecialidad = !textoEspecialidad || nombreEsp.includes(textoEspecialidad);
    const coincidePaciente = this.userRole === 'especialista'
      ? (!textoPaciente || nombrePaciente.includes(textoPaciente))
      : true;
    const coincideEspecialista = this.userRole === 'paciente'
      ? (!textoEspecialista || nombreEspecialista.includes(textoEspecialista))
      : true;

    return coincideEspecialidad && coincidePaciente && coincideEspecialista;
  });
}

async marcarComoRealizado(turno: any) {
  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'finalizado' }) // ✅ solo campo permitido
    .eq('id', turno.id);

  if (error) {
    console.error('❌ Error al marcar como finalizado:', error);
    alert('No se pudo actualizar el estado del turno.');
  } else {
    alert('Turno marcado como finalizado correctamente.');
    this.cargarTurnosEspecialista();
  }
}

async aceptarTurno(turno: any) {
  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'aceptado' })
    .eq('id', turno.id);

  if (error) {
    alert('No se pudo aceptar el turno');
    console.error(error);
  } else {
    alert('Turno aceptado correctamente.');
    this.cargarTurnosEspecialista();
  }
}

async rechazarTurno(turno: any) {
  const motivo = prompt('Ingrese el motivo del rechazo:');
  if (!motivo || !motivo.trim()) {
    alert('Debe ingresar un motivo.');
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'rechazado', nota_cancelacion: motivo })
    .eq('id', turno.id);

  if (error) {
    alert('No se pudo rechazar el turno');
    console.error(error);
  } else {
    alert('Turno rechazado correctamente.');
    this.cargarTurnosEspecialista();
  }
}

async cancelarTurnoEspecialista(turno: any) {
  if(turno.estado !== 'aceptado' && turno.estado !== 'solicitado') {
    alert('Solo se puede cancelar turnos en estado solicitado o aceptado.');
    return;
  }
  const comentario = prompt('Ingrese el motivo de la cancelación:');
  if (!comentario || !comentario.trim()) {
    alert('Debe ingresar un motivo para cancelar el turno.');
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'cancelado', nota_cancelacion: comentario })
    .eq('id', turno.id);

  if (error) {
    alert('No se pudo cancelar el turno.');
    console.error(error);
  } else {
    alert('Turno cancelado correctamente.');
    this.cargarTurnosEspecialista();
  }
}

async marcarComoFinalizado(turno: any) {
  if(turno.estado !== 'aceptado') {
    alert('Solo se puede finalizar turnos aceptados.');
    return;
  }
  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'finalizado' })
    .eq('id', turno.id);

  if (error) {
    alert('No se pudo finalizar el turno.');
    console.error(error);
  } else {
    alert('Turno finalizado correctamente.');
    this.cargarTurnosEspecialista();
  }
}


}