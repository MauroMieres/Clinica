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

  // Campos que NO se deben exportar
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
        // Convierte booleanos a "SI" o "NO"
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
  }, 500); // 0.5s = duración de la animación en CSS
}


}
