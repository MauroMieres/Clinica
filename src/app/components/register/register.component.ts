import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { User } from '@supabase/supabase-js';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  isLoading: boolean = false;


  tipoUsuario: string = ''; // paciente, admin, especialista

  // Campos comunes
  email: string = '';
  password: string = '';
  nombre: string = '';
  apellido: string = '';
  edad: number = 0;
  dni: string = '';
  foto1_file: File | null = null;
  foto2_file: File | null = null;

  // Campos específicos
  obraSocial: string = '';
  paciente_activo: boolean = false;

  especialidad: string = '';
  especialista_activo: boolean = false;

  admin_activo: boolean = false;

  // Para especialidades
  especialidades: string[] = [];
  especialidadSeleccionada: string = '';
  especialidadPersonalizada: string = '';

  errorMessage: string = '';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    this.obtenerEspecialidades();
  }

  obtenerEspecialidades() {
    this.supabaseService.client
      .from('especialidades')
      .select('nombre')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error al obtener especialidades:', error.message);
        } else {
          this.especialidades = data.map((e: any) => e.nombre);
          this.especialidades.push('Otra');
        }
      });
  }

  async register() {
     this.isLoading = true; // 👉 Mostrar spinner

    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: this.email,
      password: this.password,
    });

    if (error) {
      this.errorMessage = 'Error: ' + error.message;
      return;
    }

    console.log('Usuario registrado:', data.user);

    const { foto1_url, foto2_url } = await this.saveFile();

    if (data?.user) {
      this.saveUserData(data.user, foto1_url, foto2_url);
    }

     this.isLoading = false;
  }

 async saveUserData(user: User, foto1_url: string | null, foto2_url: string | null) {
  switch (this.tipoUsuario) {

    case 'paciente':
      const payloadPaciente = {
        id_auth_user: user.id,
        nombre: this.nombre,
        apellido: this.apellido,
        edad: this.edad,
        dni: this.dni,
        obra_social: this.obraSocial,
        email: this.email,
        foto1_url,
        foto2_url: foto2_url || null,
        paciente_activo: true
      };

      console.log('Payload paciente:', payloadPaciente);

      const { error: pacienteError } = await this.supabaseService.client
        .from('pacientes')
        .insert([payloadPaciente]);

      if (pacienteError) {
        if (pacienteError.message.includes('pacientes_email_key')) {
          this.errorMessage = 'El correo ya está registrado';
        } else {
          this.errorMessage = 'Error al registrar paciente: ' + pacienteError.message;
        }
        return;
      }

      this.router.navigate(['/login']);
      break;

    case 'especialista':
      const especialidadFinal = this.especialidadSeleccionada === 'Otra'
        ? this.especialidadPersonalizada
        : this.especialidadSeleccionada;

      if (this.especialidadSeleccionada === 'Otra' && this.especialidadPersonalizada) {
        const { error: insertEspecialidadError } = await this.supabaseService.client
          .from('especialidades')
          .insert([{ nombre: this.especialidadPersonalizada }]);

        if (insertEspecialidadError) {
          console.warn('No se pudo insertar nueva especialidad:', insertEspecialidadError.message);
        } else {
          console.log('Especialidad personalizada registrada.');
        }
      }

      const payloadEspecialista = {
        id_auth_user: user.id,
        nombre: this.nombre,
        apellido: this.apellido,
        edad: this.edad,
        dni: this.dni,
        email: this.email,
        foto_url: foto1_url,
        especialidad: especialidadFinal,
        especialista_activo: false
      };

      console.log('Payload especialista:', payloadEspecialista);

      const { error: especialistaError } = await this.supabaseService.client
        .from('especialistas')
        .insert([payloadEspecialista]);

      if (especialistaError) {
        if (especialistaError.message.includes('especialistas_email_key')) {
          this.errorMessage = 'El correo ya está registrado';
        } else {
          this.errorMessage = 'Error al registrar especialista: ' + especialistaError.message;
        }
        return;
      }

      this.router.navigate(['/login']);
      break;

    case 'administrador':
        const payloadAdmin = {
        id_auth_user: user.id,
        nombre: this.nombre,
        apellido: this.apellido,
        edad: this.edad,
        dni: this.dni,
        email: this.email,
        foto_url: foto1_url,
        admin_activo: true,
      };

      console.log('Payload admin:', payloadAdmin);

      const { error: adminError } = await this.supabaseService.client
        .from('administradores')
        .insert([payloadAdmin]);

      if (adminError) {
        if (adminError.message.includes('administrador_email_key')) {
          this.errorMessage = 'El correo ya está registrado';
        } else {
          this.errorMessage = 'Error al registrar admin: ' + adminError.message;
        }
        return;
      }
      break;
  }
}


 async saveFile(): Promise<{ foto1_url: string | null, foto2_url: string | null }> {
  let foto1_url: string | null = null;
  let foto2_url: string | null = null;

  const cleanEmail = this.email.replace(/[@.]/g, '_').toLowerCase();
  const BUCKET = 'imagenes';
  const STORAGE_BASE_URL = 'https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public'; // reemplazá con tu URL si es otro proyecto

  if (this.foto1_file) {
    const ext1 = this.foto1_file.name.split('.').pop();
    const filename1 = `${cleanEmail}1.${ext1}`;
    const fullPath1 = `usuarios/${filename1}`;

    const { error } = await this.supabaseService.client.storage
      .from(BUCKET)
      .upload(fullPath1, this.foto1_file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error al subir la primera imagen:', error.message);
    } else {
      foto1_url = `${STORAGE_BASE_URL}/${BUCKET}/${fullPath1}`;
    }
  }

  if (this.foto2_file) {
    const ext2 = this.foto2_file.name.split('.').pop();
    const filename2 = `${cleanEmail}2.${ext2}`;
    const fullPath2 = `usuarios/${filename2}`;

    const { error } = await this.supabaseService.client.storage
      .from(BUCKET)
      .upload(fullPath2, this.foto2_file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error al subir la segunda imagen:', error.message);
    } else {
      foto2_url = `${STORAGE_BASE_URL}/${BUCKET}/${fullPath2}`;
    }
  }

  return { foto1_url, foto2_url };
}


  onFoto1Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.foto1_file = input.files[0];
      console.log('Foto 1 seleccionada:', this.foto1_file.name);
    } else {
      this.foto1_file = null;
      console.warn('No se seleccionó ningún archivo en Foto 1');
    }
  }

  onFoto2Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.foto2_file = input.files[0];
      console.log('Foto 2 seleccionada:', this.foto2_file.name);
    } else {
      this.foto2_file = null;
      console.warn('No se seleccionó ningún archivo en Foto 2');
    }
  }
}
