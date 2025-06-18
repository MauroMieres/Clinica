import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

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
  if (turno.estado === 'finalizado') {
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
    await Swal.fire({
      icon: 'warning',
      title: 'Debe seleccionar un horario válido.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { error } = await this.supabaseService.client.from('turnos').insert([{
    id_paciente: this.userId,
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
    this.modoSolicitud = false;
    this.cargarTurnosPaciente();
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
    .update({ estado: 'finalizado' })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo actualizar el estado del turno.',
      confirmButtonText: 'Ok'
    });
    console.error('❌ Error al marcar como finalizado:', error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno marcado como finalizado correctamente.',
      confirmButtonText: 'Ok'
    });
    this.cargarTurnosEspecialista();
  }
}


async aceptarTurno(turno: any) {
  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'aceptado' })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo aceptar el turno',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno aceptado correctamente.',
      confirmButtonText: 'Ok'
    });
    this.cargarTurnosEspecialista();
  }
}


async rechazarTurno(turno: any) {
  const { value: motivo } = await Swal.fire({
    title: 'Motivo de rechazo',
    input: 'textarea',
    inputLabel: 'Ingrese el motivo del rechazo',
    inputPlaceholder: 'Escriba aquí el motivo...',
    showCancelButton: true,
    confirmButtonText: 'Rechazar turno',
    cancelButtonText: 'Volver'
  });

  if (!motivo || !motivo.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Debe ingresar un motivo.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'rechazado', nota_cancelacion: motivo })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo rechazar el turno',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno rechazado correctamente.',
      confirmButtonText: 'Ok'
    });
    this.cargarTurnosEspecialista();
  }
}


async cancelarTurnoEspecialista(turno: any) {
  if (turno.estado !== 'aceptado' && turno.estado !== 'solicitado') {
    await Swal.fire({
      icon: 'warning',
      title: 'Solo se puede cancelar turnos en estado solicitado o aceptado.',
      confirmButtonText: 'Ok'
    });
    return;
  }
  const { value: comentario } = await Swal.fire({
    title: 'Motivo de la cancelación',
    input: 'textarea',
    inputLabel: 'Ingrese el motivo de la cancelación',
    inputPlaceholder: 'Escriba aquí el motivo...',
    showCancelButton: true,
    confirmButtonText: 'Cancelar turno',
    cancelButtonText: 'Volver'
  });
  if (!comentario || !comentario.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Debe ingresar un motivo para cancelar el turno.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'cancelado', nota_cancelacion: comentario })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo cancelar el turno.',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno cancelado correctamente.',
      confirmButtonText: 'Ok'
    });
    this.cargarTurnosEspecialista();
  }
}


async marcarComoFinalizado(turno: any) {
  if (turno.estado !== 'aceptado') {
    await Swal.fire({
      icon: 'warning',
      title: 'Solo se puede finalizar turnos aceptados.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  // Pedir la reseña
  const { value: resena } = await Swal.fire({
    title: 'Reseña del turno',
    input: 'textarea',
    inputLabel: 'Describa la atención, diagnóstico, indicaciones, etc.',
    inputPlaceholder: 'Escriba aquí la reseña médica...',
    inputAttributes: {
      'aria-label': 'Escriba aquí la reseña'
    },
    showCancelButton: true,
    confirmButtonText: 'Finalizar turno',
    cancelButtonText: 'Volver'
  });

  if (!resena || !resena.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Debe ingresar una reseña para finalizar el turno.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  // Guardar la reseña junto con el cambio de estado
  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ estado: 'finalizado', resena: resena })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire({
      icon: 'error',
      title: 'No se pudo finalizar el turno.',
      confirmButtonText: 'Ok'
    });
    console.error(error);
  } else {
    await Swal.fire({
      icon: 'success',
      title: 'Turno finalizado correctamente.',
      confirmButtonText: 'Ok'
    });
    this.cargarTurnosEspecialista();
  }
}



abrirResena(turno: any) {
  let html = '';
  if (turno.resena) {
    html += `<div><strong>Reseña médica:</strong><br>${turno.resena}</div>`;
  }
  if (turno.comentario) {
    html += `<div class="mt-2"><strong>Comentario del paciente:</strong><br>${turno.comentario}</div>`;
  }
  if (turno.nota_cancelacion) {
    html += `<div class="mt-2"><strong>Motivo de cancelación/rechazo:</strong><br>${turno.nota_cancelacion}</div>`;
  }
  if (!html) {
    html = '<i>No hay reseña ni comentarios disponibles.</i>';
  }

  Swal.fire({
    title: 'Detalles del Turno',
    html,
    icon: 'info',
    confirmButtonText: 'Cerrar',
    customClass: {
      htmlContainer: 'text-start'
    }
  });
}


async completarEncuesta(turno: any) {
  // 1. Paso: elige estrellas y escribe texto en un SweetAlert custom
  const { value: formValues } = await Swal.fire({
    title: 'Completar encuesta',
    html: `
      <div style="margin-bottom:10px;">
        <label style="display:block;margin-bottom:5px;">Calificá la atención:</label>
        <div id="star-rating" style="font-size:2rem; color: #ffc107;">
          <span class="swal-star" data-value="1">&#9733;</span>
          <span class="swal-star" data-value="2">&#9733;</span>
          <span class="swal-star" data-value="3">&#9733;</span>
          <span class="swal-star" data-value="4">&#9733;</span>
          <span class="swal-star" data-value="5">&#9733;</span>
        </div>
      </div>
      <textarea id="encuesta-text" class="swal2-textarea" placeholder="Escribí tu opinión..." style="width:100%"></textarea>
    `,
    focusConfirm: false,
    preConfirm: async () => {
      const estrellas = (document.querySelector('.swal-star.selected:last-of-type') as HTMLElement)?.getAttribute('data-value');
      const encuesta = (document.getElementById('encuesta-text') as HTMLTextAreaElement).value;
      if (!estrellas) {
        Swal.showValidationMessage('Debés seleccionar una calificación (estrellas)');
        return false;
      }
      if (!encuesta || encuesta.trim().length < 5) {
        Swal.showValidationMessage('Escribí al menos 5 caracteres en la encuesta');
        return false;
      }
      return { estrellas: parseInt(estrellas), encuesta };
    },
    didOpen: () => {
      // Logica de estrellas clickeables
      const stars = Array.from(document.querySelectorAll('.swal-star')) as HTMLElement[];
      stars.forEach((star, i) => {
        star.addEventListener('mouseenter', () => {
          stars.forEach((s, j) => s.style.color = j <= i ? '#ffc107' : '#e4e5e9');
        });
        star.addEventListener('mouseleave', () => {
          const selected = document.querySelectorAll('.swal-star.selected').length;
          stars.forEach((s, j) => s.style.color = j < selected ? '#ffc107' : '#e4e5e9');
        });
        star.addEventListener('click', () => {
          stars.forEach((s, j) => {
            if (j <= i) s.classList.add('selected');
            else s.classList.remove('selected');
            s.style.color = j <= i ? '#ffc107' : '#e4e5e9';
          });
        });
      });
    },
    showCancelButton: true,
    confirmButtonText: 'Enviar',
    cancelButtonText: 'Cancelar'
  });

  if (formValues) {
    // 2. Paso: guardar en Supabase
    const { error } = await this.supabaseService.client
      .from('encuestas')
      .insert([{
        id_turno: turno.id,
        encuesta: formValues.encuesta,
        estrellas: formValues.estrellas
      }]);
    if (error) {
      await Swal.fire('Error', 'No se pudo guardar la encuesta', 'error');
      return;
    }
    // 3. (Opcional) marcar en el turno que fue completada la encuesta
    await this.supabaseService.client
      .from('turnos')
      .update({ encuesta_completada: true })
      .eq('id', turno.id);

    await Swal.fire('¡Gracias!', 'Tu encuesta fue enviada con éxito.', 'success');
    this.cargarTurnosPaciente(); // refresca el listado
  }
}

async calificarAtencion(turno: any) {
  const { value: comentario } = await Swal.fire({
    title: 'Calificar atención',
    input: 'textarea',
    inputLabel: '¿Cómo fue la atención?',
    inputPlaceholder: 'Escribí tu comentario sobre la atención recibida...',
    inputAttributes: {
      'aria-label': 'Escribí tu comentario'
    },
    showCancelButton: true,
    confirmButtonText: 'Enviar',
    cancelButtonText: 'Cancelar'
  });

  if (!comentario || !comentario.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Debe ingresar un comentario para calificar la atención.',
      confirmButtonText: 'Ok'
    });
    return;
  }

  const { error } = await this.supabaseService.client
    .from('turnos')
    .update({ comentario: comentario.trim() })
    .eq('id', turno.id);

  if (error) {
    await Swal.fire('Error', 'No se pudo guardar el comentario.', 'error');
  } else {
    await Swal.fire('¡Gracias!', 'Tu comentario fue enviado con éxito.', 'success');
    this.cargarTurnosPaciente(); // refresca la lista
  }
}



}
