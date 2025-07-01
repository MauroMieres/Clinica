import { Component } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitar-turnos',
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitar-turnos.component.html',
  styleUrl: './solicitar-turnos.component.css'
})
export class SolicitarTurnosComponent {
  userId: string = '';
  userRole: 'paciente' | 'especialista' | 'admin' | '' = '';

  pacientes: any[] = [];
  pacienteSeleccionadoPorAdmin: string | null = null;

  modoSolicitud = false;
  especialistas: any[] = [];
  especialidades: any[] = [];
  especialistaSeleccionado: any = null;
  especialidadesDelProfesional: any[] = [];
  especialidadSeleccionada: any = null;
  diasConTurnos: Date[] = [];
  diaSeleccionado: Date | null = null;
  horariosDisponiblesPorDia: any[] = [];
  horarioSeleccionado: any = null;

  defaultFotoProfesional = 'assets/doctor-default.jpg';
  defaultFotoEspecialidad = 'assets/especialidad-default.jpg';

  filtroEspecialidadTexto: string = '';
  filtroNombreEspecialista: string = '';

  diasSemana: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.userId = localUser.id;
    this.userRole = localUser.rol;

    if (this.userRole !== 'paciente' && this.userRole !== 'admin') {
      Swal.fire('Acceso denegado', 'No tenés permiso para solicitar turnos.', 'error');
      return;
    }
    if (this.userRole === 'admin') {
      await this.cargarPacientes();
    }
  }

  async cargarPacientes() {
    const { data, error } = await this.supabaseService.client.from('pacientes').select('id, nombre, apellido');
    if (!error) {
      this.pacientes = data || [];
    }
  }

  async abrirSolicitud() {
    this.modoSolicitud = true;
    const [especialistasRes, especialidadesRes] = await Promise.all([
      this.supabaseService.client.from('especialistas').select('*'),
      this.supabaseService.client.from('especialidades').select('*')
    ]);
    this.especialistas = (especialistasRes.data || []).filter((esp: any) => esp.especialista_activo);
    this.especialidades = especialidadesRes.data || [];
    this.especialistaSeleccionado = null;
    this.especialidadesDelProfesional = [];
    this.especialidadSeleccionada = null;
    this.diasConTurnos = [];
    this.diaSeleccionado = null;
    this.horariosDisponiblesPorDia = [];
    this.horarioSeleccionado = null;
  }

  async seleccionarProfesional(esp: any) {
    this.especialistaSeleccionado = esp;
    const { data } = await this.supabaseService.client
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', esp.id);
    const especialidadIds = data?.map((e: any) => e.especialidad_id) || [];
    this.especialidadesDelProfesional = this.especialidades.filter(e => especialidadIds.includes(e.id));
    this.especialidadSeleccionada = null;
    this.diasConTurnos = [];
    this.diaSeleccionado = null;
    this.horariosDisponiblesPorDia = [];
    this.horarioSeleccionado = null;
  }

  async seleccionarEspecialidad(espec: any) {
    this.especialidadSeleccionada = espec;
    await this.buscarDiasConTurnosDisponibles();
    this.diaSeleccionado = null;
    this.horariosDisponiblesPorDia = [];
    this.horarioSeleccionado = null;
  }

  async buscarDiasConTurnosDisponibles() {
    const { data: horariosRaw } = await this.supabaseService.client
      .from('horarios_atencion')
      .select('*')
      .eq('especialista_id', this.especialistaSeleccionado.id)
      .eq('especialidad_id', this.especialidadSeleccionada.id);

    const horarios = horariosRaw || [];
    const hoy = new Date();
    const diasDisponibles: Date[] = [];
    for (let i = 0; i <= 15; i++) {
      const fecha = new Date(hoy);
      fecha.setHours(0, 0, 0, 0);
      fecha.setDate(hoy.getDate() + i);
      const dia = this.diasSemana[fecha.getDay()];
      const hayHorarios = horarios.some(h => h.dia_semana === dia && h.activo);
      if (hayHorarios) {
        diasDisponibles.push(new Date(fecha));
      }
    }
    this.diasConTurnos = diasDisponibles;
  }

  async seleccionarDia(dia: Date) {
    this.diaSeleccionado = dia;
    await this.buscarHorariosParaDia();
    this.horarioSeleccionado = null;
  }

  async buscarHorariosParaDia() {
    if (!this.diaSeleccionado) {
      this.horariosDisponiblesPorDia = [];
      return;
    }
    const diaSemana = this.diasSemana[this.diaSeleccionado.getDay()];
    const { data: horariosRaw } = await this.supabaseService.client
      .from('horarios_atencion')
      .select('*')
      .eq('especialista_id', this.especialistaSeleccionado.id)
      .eq('especialidad_id', this.especialidadSeleccionada.id)
      .eq('dia_semana', diaSemana)
      .eq('activo', true);

    const horarios = horariosRaw || [];
    if (!horarios.length) {
      this.horariosDisponiblesPorDia = [];
      return;
    }
    const fechaBase = new Date(this.diaSeleccionado);
    fechaBase.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(fechaBase);
    fechaLimite.setHours(23, 59, 59, 999);

    const fechaBaseStr = this.formatFechaLocal(fechaBase);
    const fechaLimiteStr = this.formatFechaLocal(fechaLimite);

    const { data: turnosOcupadosRaw } = await this.supabaseService.client
      .from('turnos')
      .select('fecha_inicio')
      .eq('id_especialista', this.especialistaSeleccionado.id)
      .eq('id_especialidad', this.especialidadSeleccionada.id)
      .gte('fecha_inicio', fechaBaseStr)
      .lte('fecha_inicio', fechaLimiteStr)
      .in('estado', ['solicitado', 'aceptado', 'finalizado']);

    const ocupados = (turnosOcupadosRaw || []).map((t: any) => {
      const f = new Date(t.fecha_inicio.replace(' ', 'T'));
      return f.getHours().toString().padStart(2, '0') + ':' + f.getMinutes().toString().padStart(2, '0');
    });

    const posiblesTurnos: any[] = [];
    for (const h of horarios) {
      const [hInicioHoras, hInicioMin] = h.hora_inicio.split(":").map(Number);
      const [hFinHoras, hFinMin] = h.hora_fin.split(":").map(Number);

      const inicio = new Date(this.diaSeleccionado);
      inicio.setHours(hInicioHoras, hInicioMin, 0, 0);

      const fin = new Date(this.diaSeleccionado);
      fin.setHours(hFinHoras, hFinMin, 0, 0);

      while (inicio < fin) {
        const turnoFin = new Date(inicio.getTime() + h.duracion_turno * 60000);
        const horaStr = inicio.getHours().toString().padStart(2, '0') + ':' + inicio.getMinutes().toString().padStart(2, '0');
        if (!ocupados.includes(horaStr) && turnoFin <= fin) {
          posiblesTurnos.push({
            fecha_inicio: new Date(inicio),
            fecha_fin: new Date(turnoFin)
          });
        }
        inicio.setMinutes(inicio.getMinutes() + h.duracion_turno);
      }
    }
    this.horariosDisponiblesPorDia = posiblesTurnos;
  }

  seleccionarHorario(hora: any) {
    this.horarioSeleccionado = hora;
  }

  formatFechaLocal(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    const segundos = '00';
    return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
  }

  // Confirmar turno (paciente o admin)
  async confirmarTurno() {
    if (!this.horarioSeleccionado?.fecha_inicio || !this.horarioSeleccionado?.fecha_fin) {
      await Swal.fire({
        icon: 'warning',
        title: 'Debe seleccionar un horario válido.',
        confirmButtonText: 'Ok'
      });
      return;
    }
    let pacienteId = this.userId;
    if (this.userRole === 'admin') {
      if (!this.pacienteSeleccionadoPorAdmin) {
        await Swal.fire('Debés seleccionar un paciente', '', 'warning');
        return;
      }
      pacienteId = this.pacienteSeleccionadoPorAdmin;
    }

    // Validar que el turno sigue disponible (ahora usando string local)
    const fechaInicioLocal = this.formatFechaLocal(this.horarioSeleccionado.fecha_inicio);
    const { data: turnosExistentes } = await this.supabaseService.client
      .from('turnos')
      .select('id')
      .eq('id_especialista', this.especialistaSeleccionado.id)
      .eq('id_especialidad', this.especialidadSeleccionada.id)
      .eq('fecha_inicio', fechaInicioLocal)
      .in('estado', ['solicitado', 'aceptado', 'finalizado']);

    if (turnosExistentes && turnosExistentes.length > 0) {
      await Swal.fire({
        icon: 'error',
        title: 'Ese turno ya fue reservado por otro paciente.',
        confirmButtonText: 'Ok'
      });
      this.modoSolicitud = false;
      return;
    }

    // Insertar el turno (fecha en formato local)
    const fechaFinLocal = this.formatFechaLocal(this.horarioSeleccionado.fecha_fin);
    const { error } = await this.supabaseService.client.from('turnos').insert([{
      id_paciente: pacienteId,
      id_especialista: this.especialistaSeleccionado.id,
      id_especialidad: this.especialidadSeleccionada.id,
      fecha_inicio: fechaInicioLocal,
      fecha_fin: fechaFinLocal,
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
      this.especialistaSeleccionado = null;
      this.especialidadesDelProfesional = [];
      this.especialidadSeleccionada = null;
      this.diasConTurnos = [];
      this.diaSeleccionado = null;
      this.horariosDisponiblesPorDia = [];
      this.horarioSeleccionado = null;
      this.modoSolicitud = false;
    }
  }
}
