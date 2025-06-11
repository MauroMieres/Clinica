import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { FormsModule } from '@angular/forms';

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

}
