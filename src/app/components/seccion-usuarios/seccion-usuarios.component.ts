import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';



@Component({
  selector: 'app-seccion-usuarios',
  standalone: true,
  templateUrl: './seccion-usuarios.component.html',
  styleUrl: './seccion-usuarios.component.css',
  imports: [CommonModule, RouterLink, FormsModule]
})
export class SeccionUsuariosComponent implements OnInit {
  pacientes: any[] = [];
  especialistas: any[] = [];
  administradores: any[] = [];
  isFadingOut = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  async cargarUsuarios() {
    const [pacResp, espResp, admResp] = await Promise.all([
      this.supabase.client.from('pacientes').select('*'),
      this.supabase.client.from('especialistas').select('*'),
      this.supabase.client.from('administradores').select('*')
    ]);

    if (!pacResp.error) this.pacientes = pacResp.data;
    if (!espResp.error) this.especialistas = espResp.data;
    if (!admResp.error) this.administradores = admResp.data;
  }

  verDetalle(usuario: any, tipo: string) {
  this.router.navigate(['/detalle-usuario'], {
    state: { usuario, tipo }
  });
}

exportarUsuariosAExcel() {
    const datos = [
      ...this.pacientes.map(u => ({ ...u, tipo: 'Paciente' })),
      ...this.especialistas.map(u => ({ ...u, tipo: 'Especialista' })),
      ...this.administradores.map(u => ({ ...u, tipo: 'Administrador' }))
    ];

    const camposNoDeseados = [
      'id',
      'id_auth_user',
      'foto1_url',
      'foto2_url',
      'foto_url'
    ];

    const datosLimpios = datos.map(user => {
      const nuevoUser: any = {};
      Object.keys(user).forEach(key => {
        if (!camposNoDeseados.includes(key)) {
          if (typeof user[key] === 'boolean') {
            nuevoUser[key] = user[key] ? 'SI' : 'NO';
          } else {
            nuevoUser[key] = user[key];
          }
        }
      });
      return nuevoUser;
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosLimpios);
    const wb: XLSX.WorkBook = { Sheets: { 'Usuarios': ws }, SheetNames: ['Usuarios'] };
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    FileSaver.saveAs(
      new Blob([buffer], { type: 'application/octet-stream' }),
      `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }


  isSlidingOut = false;

volverAlHome() {
  this.isSlidingOut = true;
  setTimeout(() => {
    this.router.navigate(['/home']);
  }, 500);
}

async exportarTurnosPaciente(paciente: any) {
  // Traer los turnos con relaciones completas
  const { data: turnos, error } = await this.supabase.client
    .from('turnos')
    .select(`
      fecha_inicio,
      fecha_fin,
      estado,
      resena,
      comentario,
      nota_cancelacion,
      especialistas:especialistas (
        nombre,
        apellido,
        email
      ),
      especialidades:especialidades (
        nombre
      )
    `)
    .eq('id_paciente', paciente.id)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    alert('No se pudo exportar los turnos del paciente');
    return;
  }

  const datosExcel = (turnos || []).map((t: any) => ({
    'Fecha Inicio': t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleString() : '',
    'Fecha Fin': t.fecha_fin ? new Date(t.fecha_fin).toLocaleString() : '',
    'Especialidad': t.especialidades?.nombre || '',
    'Especialista': t.especialistas ? (t.especialistas.nombre + ' ' + t.especialistas.apellido) : '',
    'Email Especialista': t.especialistas?.email || '',
    'Estado': t.estado,
    'Reseña': t.resena,
    'Comentario Paciente': t.comentario,
    'Motivo cancelación/rechazo': t.nota_cancelacion
  }));

  if (!datosExcel.length) {
    alert('Este paciente no tiene turnos registrados.');
    return;
  }

  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
  const wb: XLSX.WorkBook = { Sheets: { 'TurnosPaciente': ws }, SheetNames: ['TurnosPaciente'] };
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  FileSaver.saveAs(
    new Blob([buffer], { type: 'application/octet-stream' }),
    `turnos_${paciente.apellido}_${paciente.nombre}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}


}
