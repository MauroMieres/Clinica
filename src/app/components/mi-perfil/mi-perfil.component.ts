import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { NgIf } from '@angular/common';
import { MiPerfilHorariosComponent } from '../especialista/mi-perfil-horarios.component';


@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, NgIf,MiPerfilHorariosComponent],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {
  user: any = null;
  userRole: string = '';
  especialidadesDelEspecialista: string[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = localStorage.getItem('userRole') || '';
    const userId = localUser.id;

    console.log('🟡 Usuario desde localStorage:', localUser);
    console.log('🟡 Rol desde localStorage:', this.userRole);

    let table = '';
    switch (this.userRole) {
      case 'paciente':
        table = 'pacientes';
        break;
      case 'especialista':
        table = 'especialistas';
        break;
          case 'admin':
  case 'administrador':
    table = 'administradores';
    break;
    }

    try {
      console.log('🔍 Tabla que se consulta:', table);
      console.log('🔍 ID que se consulta:', userId);

      const { data, error } = await this.supabaseService.client
        .from(table)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error al obtener usuario:', error);
      } else if (!data) {
        console.warn('⚠️ No se encontró usuario con ese ID en la tabla', table);
      } else {
        this.user = data;
        console.log('✅ Usuario cargado:', this.user);
      }

      // Si es especialista, obtener especialidades
      if (this.userRole === 'especialista') {
        const { data: relaciones } = await this.supabaseService.client
          .from('especialista_especialidad')
          .select('especialidades (nombre)')
          .eq('especialista_id', userId);

        this.especialidadesDelEspecialista = relaciones?.map((r: any) => r.especialidades?.nombre) || [];
        console.log('📘 Especialidades:', this.especialidadesDelEspecialista);
      }

    } catch (e) {
      console.error('❌ Excepción al cargar perfil:', e);
    }
  }
}
