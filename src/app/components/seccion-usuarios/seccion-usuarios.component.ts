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
    // Unifica los arrays agregando una columna tipo
    const datos = [
      ...this.pacientes.map(u => ({ ...u, tipo: 'Paciente' })),
      ...this.especialistas.map(u => ({ ...u, tipo: 'Especialista' })),
      ...this.administradores.map(u => ({ ...u, tipo: 'Administrador' }))
    ];

    // Remueve columnas no deseadas, si querés (opcional)
    // const datosLimpios = datos.map(({ password, ...rest }) => rest);

    // Crea el sheet y el archivo
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = { Sheets: { 'Usuarios': ws }, SheetNames: ['Usuarios'] };
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    FileSaver.saveAs(new Blob([buffer], { type: 'application/octet-stream' }),
      `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

   volverAlHome() {
    this.isFadingOut = true;
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 500); // Tiempo igual al CSS (0.5s)
  }

}
