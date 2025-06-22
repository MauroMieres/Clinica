import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-mi-perfil-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil-horarios.component.html',
})
export class MiPerfilHorariosComponent implements OnInit {
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  especialidades: { id: number; nombre: string }[] = [];

  horarios: {
    [dia: string]: {
      [especialidadId: number]: {
        hora_inicio: string;
        hora_fin: string;
        duracion_turno: number;
        activo: boolean;
      };
    };
  } = {};

  horariosGuardados: {
  [dia: string]: {
    [especialidadId: number]: {
      hora_inicio: string;
      hora_fin: string;
      duracion_turno: number;
      activo: boolean;
    };
  };
} = {};


  constructor(private supabase: SupabaseService) {}

 async ngOnInit() {
  const { data: userData } = await this.supabase.client.auth.getUser();
  const id_auth_user = userData.user?.id;

  // Paso 1: obtener ID real del especialista
  const { data: especialistaData, error: errorEspecialista } = await this.supabase.client
    .from('especialistas')
    .select('id')
    .eq('id_auth_user', id_auth_user)
    .maybeSingle();

    

  if (!especialistaData) {
    console.warn('❌ No se encontró el especialista con este id_auth_user');
    return;
  }

  

  const especialistaId = especialistaData.id;

  // Paso 2: obtener especialidades asignadas
  const { data, error } = await this.supabase.client
    .from('especialista_especialidad')
    .select('especialidad_id, especialidades(nombre)')
    .eq('especialista_id', especialistaId);

  if (!data || data.length === 0) {
    console.warn('⚠️ No se encontraron especialidades para este especialista');
    return;
  }

  this.especialidades = data.map((d: any) => ({
    id: d.especialidad_id,
    nombre: d.especialidades?.nombre || '[Sin nombre]'
  }));

  console.log('✅ Especialidades cargadas:', this.especialidades);

  // Paso 3: inicializar estructura de horarios vacía
  for (let dia of this.diasSemana) {
    this.horarios[dia] = {};
    for (let esp of this.especialidades) {
      this.horarios[dia][esp.id] = {
        hora_inicio: '',
        hora_fin: '',
        duracion_turno: 30,
        activo: false,
      };
    }
  }

  this.horariosGuardados = {};

const { data: horariosCargados } = await this.supabase.client
  .from('horarios_atencion')
  .select('*')
  .eq('especialista_id', especialistaId);

for (const horario of horariosCargados || []) {
  const dia = horario.dia_semana;
  const espId = horario.especialidad_id;

  if (!this.horariosGuardados[dia]) this.horariosGuardados[dia] = {};
  this.horariosGuardados[dia][espId] = horario;
}

}



async guardarHorarios() {
  const { data: userData } = await this.supabase.client.auth.getUser();
  const id_auth_user = userData.user?.id;

  // Obtener el ID real del especialista
  const { data: especialistaData } = await this.supabase.client
    .from('especialistas')
    .select('id')
    .eq('id_auth_user', id_auth_user)
    .maybeSingle();

  if (!especialistaData) {
    alert('❌ No se pudo encontrar el especialista');
    return;
  }

  const especialistaId = especialistaData.id;
  const payload: any[] = [];

  for (const dia of this.diasSemana) {
    const rangos: { inicio: string; fin: string }[] = [];

    for (const esp of this.especialidades) {
  const h = this.horarios[dia][esp.id];
  if (!h.activo) continue;

  const error = this.validarHorario(dia, h.hora_inicio, h.hora_fin, h.duracion_turno);
  if (error) {
    alert(`${dia} - ${esp.nombre}: ${error}`);
    return; 
  }

  const ini = h.hora_inicio;
  const fin = h.hora_fin;
  const duracion = h.duracion_turno;

 
  const minutosTotales = this.getMinutosEntre(ini, fin);

  // Validar superposición de horarios
  for (const r of rangos) {
    if (
      (ini >= r.inicio && ini < r.fin) ||
      (fin > r.inicio && fin <= r.fin) ||
      (ini <= r.inicio && fin >= r.fin)
    ) {
      alert(`❌ Conflicto entre horarios de especialidades el ${dia}`);
      return;
    }
  }

  rangos.push({ inicio: ini, fin: fin });

  payload.push({
    especialista_id: especialistaId,
    especialidad_id: esp.id,
    dia_semana: dia,
    hora_inicio: ini,
    hora_fin: fin,
    duracion_turno: duracion,
    activo: true,
  });
}

  }

  // Limpiar horarios anteriores
  await this.supabase.client
    .from('horarios_atencion')
    .delete()
    .eq('especialista_id', especialistaId);

  await this.supabase.client.from('horarios_atencion').insert(payload);
  alert('✅ Horarios guardados correctamente');
}

getMinutosEntre(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

getMinHora(dia: string): string {
  return '08:00';
}

getMaxHora(dia: string): string {
  return dia === 'Sábado' ? '14:00' : '19:00';
}


validarHorario(
  dia: string,
  inicio: string,
  fin: string,
  duracion: number
): string | null {
  // 1. Campos completos
  if (!inicio || !fin) return 'Debés completar ambos horarios.';

  // 2. Parseo seguro de horas y minutos
  const [hIni, mIni] = inicio.split(':').map(Number);
  const [hFin, mFin] = fin.split(':').map(Number);

  if (
    isNaN(hIni) || isNaN(mIni) ||
    isNaN(hFin) || isNaN(mFin) ||
    hIni < 0 || hIni > 23 || hFin < 0 || hFin > 23 ||
    mIni < 0 || mIni > 59 || mFin < 0 || mFin > 59
  ) {
    return 'El formato de hora es incorrecto.';
  }

  // 3. Diferencia en minutos
  const minutosInicio = hIni * 60 + mIni;
  const minutosFin = hFin * 60 + mFin;

  if (minutosFin <= minutosInicio) {
    return 'El horario de fin debe ser posterior al de inicio.';
  }

  // 4. Duración total y validación divisibilidad
  const duracionTotal = minutosFin - minutosInicio;
  if (duracionTotal < duracion) {
    return `El rango es muy corto para la duración del turno (${duracion} min).`;
  }
  if (duracion <= 0) {
    return 'La duración del turno debe ser mayor a 0.';
  }
  if (duracionTotal % duracion !== 0) {
    return `La duración total (${duracionTotal} min) no es divisible por la duración del turno (${duracion} min).`;
  }

  // 5. Validar horario dentro de atención al público
  const apertura = 8 * 60; // 08:00
  const cierre = dia === 'Sábado' ? 14 * 60 : 19 * 60; // 14:00 o 19:00

  if (minutosInicio < apertura || minutosFin > cierre) {
    return `El horario debe estar dentro del horario de atención (${this.formatTime(apertura)} - ${this.formatTime(cierre)}).`;
  }

  return null;
}


formatTime(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}


}
