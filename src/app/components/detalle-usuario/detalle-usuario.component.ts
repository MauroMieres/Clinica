import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-detalle-usuario',
  standalone: true,
  templateUrl: './detalle-usuario.component.html',
  styleUrl: './detalle-usuario.component.css',
  imports: [CommonModule, FormsModule]
})
export class DetalleUsuarioComponent implements OnInit {
  usuario: any;
  tipo: string = '';
  campoActivo: string = '';
  cargando = false;
  mostrarConfirmacion: boolean = false;
  especialidades: string[] = [];


  constructor(private router: Router, private supabase: SupabaseService) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.usuario = navigation.extras.state['usuario'];
      this.tipo = navigation.extras.state['tipo'];
    }
  }

  async cargarEspecialidades(idEspecialista: number) {
  const { data, error } = await this.supabase.client
    .from('especialista_especialidad')
    .select('especialidades(nombre)')
    .eq('especialista_id', idEspecialista);

  if (!error && data) {
    this.especialidades = data.map((d: any) => d.especialidades.nombre);
  } else {
    console.error('Error al cargar especialidades:', error);
  }
}


  ngOnInit(): void {
      // 🔍 Mostrar payload completo en consola
    console.log('🧾 Payload recibido en DetalleUsuarioComponent:');
    console.log(JSON.stringify(this.usuario, null, 2));
    if (!this.usuario || !this.tipo) {
      this.router.navigate(['/usuarios']);
      return;
    }

    // Determinar qué campo activo usar
    switch (this.tipo) {
      case 'paciente':
        this.campoActivo = 'paciente_activo';
        break;
      case 'especialista':
        if (this.tipo === 'especialista') {
  this.cargarEspecialidades(this.usuario.id);
}

        this.campoActivo = 'especialista_activo';
        break;
      case 'administrador':
        this.campoActivo = 'admin_activo';
        break;
    }
  }

  async toggleActivo() {
    if (!this.campoActivo) return;
    this.cargando = true;

    const nuevoValor = !this.usuario[this.campoActivo];
    const { error } = await this.supabase.client
      .from(this.tipo + 's')
      .update({ [this.campoActivo]: nuevoValor })
      .eq('id_auth_user', this.usuario.id_auth_user);

    if (!error) {
      this.usuario[this.campoActivo] = nuevoValor;
    } else {
      alert('Error al actualizar estado');
    }

    this.cargando = false;
  }

    mostrarBotonConfirmar() {
    this.mostrarConfirmacion = true;
  }

  async cambiarEstadoActivo() {
    const nuevoEstado = !this.usuario[`${this.tipo}_activo`];
    const { error } = await this.supabase.client
      .from(`${this.tipo}s`) // pacientes / especialistas / administradores
      .update({ [`${this.tipo}_activo`]: nuevoEstado })
      .eq('id_auth_user', this.usuario.id_auth_user);

    if (!error) {
      this.usuario[`${this.tipo}_activo`] = nuevoEstado;
      this.mostrarConfirmacion = false;
    } else {
      console.error('Error al actualizar estado:', error.message);
    }
  }

  volver() {
  this.router.navigate(['/usuarios']);
}

getImagenes(): string[] {
  if (!this.usuario) return [];

  if (this.tipo === 'paciente') {
    const imagenes: string[] = [];
    if (this.usuario.foto1_url) imagenes.push(this.usuario.foto1_url);
    if (this.usuario.foto2_url) imagenes.push(this.usuario.foto2_url);
    return imagenes;
  } else if (this.tipo === 'especialista' || this.tipo === 'administrador') {
    return this.usuario.foto_url ? [this.usuario.foto_url] : [];
  }

  return [];
}


}
