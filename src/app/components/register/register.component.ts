import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  FormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  imports: [ReactiveFormsModule, CommonModule,FormsModule]
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  tipoUsuario = '';
  especialidades: string[] = [];
  errorMessage = '';
  mostrarAdmin: boolean = false;
  especialidadesSeleccionadas: string[] = [];
  nuevaEspecialidad: string = '';

  

  foto1_file: File | null = null;
  foto2_file: File | null = null;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.mostrarAdmin = params['admin'] === 'true';
    });

    this.obtenerEspecialidades();

    this.form = this.fb.group({
      tipoUsuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)]],
      apellido: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(99)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{1,10}$/)]],
      obraSocial: ['']
    }, {
      validators: this.validarEspecialidad.bind(this)
    });
  }

  obtenerEspecialidades() {
    this.supabaseService.client
      .from('especialidades')
      .select('nombre')
      .then(({ data, error }) => {
        if (!error && data) {
          this.especialidades = data.map((e: any) => e.nombre);
        }
      });
  }

  onTipoUsuarioChange(tipo: string) {
    this.tipoUsuario = tipo;
    const obraSocial = this.form.get('obraSocial');
    obraSocial?.clearValidators();

    if (tipo === 'paciente') {
      obraSocial?.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)
      ]);
    }

    obraSocial?.updateValueAndValidity();
    this.form.updateValueAndValidity();
  }

  validarEspecialidad(control: AbstractControl): ValidationErrors | null {
  if (this.tipoUsuario !== 'especialista') return null;

  if (!this.especialidadesSeleccionadas || this.especialidadesSeleccionadas.length === 0) {
    return { especialidadRequerida: true };
  }

  return null;
}


  onEspecialidadToggle(event: any) {
    const value = event.target.value;
    if (event.target.checked) {
      this.especialidadesSeleccionadas.push(value);
    } else {
      this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(e => e !== value);
    }
  }

  quitarEspecialidad(nombre: string) {
    this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(e => e !== nombre);
  }

  agregarEspecialidadPersonalizada() {
  if (this.nuevaEspecialidad && /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/.test(this.nuevaEspecialidad)) {
    this.especialidadesSeleccionadas.push(this.nuevaEspecialidad.trim());
    this.nuevaEspecialidad = '';
  }
}


  onFoto1Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.foto1_file = input.files[0];
  }

  onFoto2Selected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.foto2_file = input.files[0];
  }

  formularioCompleto(): boolean {

 const isFormValid = true;
  const tieneFoto1 = !!this.foto1_file;
  //const tieneFoto2 = !!this.foto2_file;
  const cantEspecialidades = this.especialidadesSeleccionadas.length;

  console.log('🧾 Validación del formulario:');
  console.log('Form válido:', isFormValid);
  console.log('Tipo usuario:', this.tipoUsuario);
  console.log('Foto 1:', tieneFoto1);
  //console.log('Foto 2:', tieneFoto2);
  console.log('Especialidades seleccionadas:', this.especialidadesSeleccionadas);
  console.log('Cantidad de especialidades:', cantEspecialidades);

  if (!isFormValid) {
    console.warn('⚠️ Campos inválidos:');
    Object.entries(this.form.controls).forEach(([nombre, control]) => {
  if (control.invalid) {
    const touched = control.touched;
    const value = control.value;
    console.warn(`❌ Campo inválido: ${nombre}`);
    console.warn(`  - Valor:`, value);
    console.warn(`  - Touched:`, touched);
    console.warn(`  - Errors:`, control.errors);
  }
});

    return false;
  }

  if (this.tipoUsuario === 'paciente') {
    if (!tieneFoto1) console.warn('⚠️ Falta Foto 1');
    //if (!tieneFoto2) console.warn('⚠️ Falta Foto 2');
    return tieneFoto1;
  }

  if (this.tipoUsuario === 'especialista') {
    if (!tieneFoto1) console.warn('⚠️ Falta Foto 1');
    if (cantEspecialidades === 0) console.warn('⚠️ No se seleccionó ninguna especialidad');
    return tieneFoto1 && cantEspecialidades > 0;
  }

  if (this.tipoUsuario === 'administrador') {
    if (!tieneFoto1) console.warn('⚠️ Falta Foto 1');
    return tieneFoto1;
  }

  return false;
}


  async register() {
    this.form.markAllAsTouched();

    if (!this.formularioCompleto()) {
      this.errorMessage = 'Faltan completar campos obligatorios.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password } = this.form.value;

    const { data, error } = await this.supabaseService.client.auth.signUp({ email, password });

    if (error) {
      this.isLoading = false;
      this.errorMessage = error.message.toLowerCase().includes('user already registered')
        ? 'Este correo ya está registrado en el sistema.'
        : 'Error al registrar el usuario: ' + error.message;
      return;
    }

    const { foto1_url, foto2_url } = await this.saveFile(email);

    if (data?.user) {
      const ok = await this.saveUserData(data.user.id, foto1_url, foto2_url);
      this.isLoading = false;
      if (!ok) return;
      this.router.navigate([this.mostrarAdmin ? '/usuarios' : '/login']);
    }
  }

 async saveUserData(userId: string, foto1_url: string | null, foto2_url: string | null): Promise<boolean> {
  const values = this.form.value;

  try {
    // Verificar si el email ya existe en alguna de las tablas
    const tablas = ['pacientes', 'especialistas', 'administradores'];
    for (const tabla of tablas) {
      const { data } = await this.supabaseService.client
        .from(tabla)
        .select('email')
        .eq('email', values.email)
        .maybeSingle();

      if (data) {
        this.errorMessage = `El correo ya está registrado.`;
        return false;
      }
    }

    switch (this.tipoUsuario) {
      case 'paciente':
        await this.supabaseService.client.from('pacientes').insert([{
          id_auth_user: userId,
          nombre: values.nombre,
          apellido: values.apellido,
          edad: values.edad,
          dni: values.dni,
          obra_social: values.obraSocial,
          email: values.email,
          foto1_url,
          foto2_url,
          paciente_activo: true
        }]);
        break;

      case 'especialista': {
        const idsEspecialidades: number[] = [];

        for (const espNombre of this.especialidadesSeleccionadas) {
          let idEspecialidad: number | null = null;

          const { data: existente } = await this.supabaseService.client
            .from('especialidades')
            .select('id')
            .eq('nombre', espNombre)
            .maybeSingle();

          if (existente) {
            idEspecialidad = existente.id;
          } else {
            const { data: nueva, error: errorNueva } = await this.supabaseService.client
              .from('especialidades')
              .insert([{ nombre: espNombre }])
              .select('id')
              .single();

            if (!errorNueva && nueva) {
              idEspecialidad = nueva.id;
            } else {
              this.errorMessage = 'Error al crear especialidad personalizada: ' + (errorNueva?.message || 'Desconocido');
              return false;
            }
          }

          if (idEspecialidad) idsEspecialidades.push(idEspecialidad);
        }

        const { data: insertado } = await this.supabaseService.client
          .from('especialistas')
          .insert([{
            id_auth_user: userId,
            nombre: values.nombre,
            apellido: values.apellido,
            edad: values.edad,
            dni: values.dni,
            email: values.email,
            foto_url: foto1_url,
            especialista_activo: false
          }])
          .select('id')
          .single();

        if (!insertado) {
          this.errorMessage = 'Error al registrar el especialista';
          return false;
        }

        const especialistaId = insertado.id;

        const relaciones = idsEspecialidades.map(id => ({
          especialista_id: especialistaId,
          especialidad_id: id
        }));

        console.log('🧩 Relaciones a insertar:', relaciones);

        const { error: errorRelaciones } = await this.supabaseService.client
          .from('especialista_especialidad')
          .insert(relaciones);

        if (errorRelaciones) {
          console.error('❌ Error al insertar relaciones:', errorRelaciones);
          this.errorMessage = 'Error al asociar especialidades: ' + (errorRelaciones?.message || 'Desconocido');
          return false;
        }

        break;
      }

      case 'administrador':
        await this.supabaseService.client.from('administradores').insert([{
          id_auth_user: userId,
          nombre: values.nombre,
          apellido: values.apellido,
          edad: values.edad,
          dni: values.dni,
          email: values.email,
          foto_url: foto1_url,
          admin_activo: true
        }]);
        break;
    }

    return true;

  } catch (err: any) {
    this.errorMessage = 'Error inesperado: ' + (err?.message || err);
    return false;
  }
}


  async saveFile(email: string): Promise<{ foto1_url: string | null, foto2_url: string | null }> {
    let foto1_url: string | null = null;
    let foto2_url: string | null = null;
    const cleanEmail = email.replace(/[@.]/g, '_').toLowerCase();
    const BUCKET = 'imagenes';
    const BASE_URL = 'https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public';

    if (this.foto1_file) {
      const ext = this.foto1_file.name.split('.').pop();
      const filename = `${cleanEmail}1.${ext}`;
      const path = `usuarios/${filename}`;
      const { error } = await this.supabaseService.client.storage.from(BUCKET).upload(path, this.foto1_file, { upsert: true });
      if (!error) foto1_url = `${BASE_URL}/${BUCKET}/${path}`;
    }

    if (this.tipoUsuario === 'paciente' && this.foto2_file) {
      const ext = this.foto2_file.name.split('.').pop();
      const filename = `${cleanEmail}2.${ext}`;
      const path = `usuarios/${filename}`;
      const { error } = await this.supabaseService.client.storage.from(BUCKET).upload(path, this.foto2_file, { upsert: true });
      if (!error) foto2_url = `${BASE_URL}/${BUCKET}/${path}`;
    }

    return { foto1_url, foto2_url };
  }
  animandoSalida = false;

  esCampoValido(campo: string): boolean {
    return this.form.get(campo)?.invalid && this.form.get(campo)?.touched || false;
  }


mostrarFormulario: boolean = false;

seleccionarTipo(tipo: string) {
  this.tipoUsuario = tipo;
  this.mostrarFormulario = true;
  this.animandoSalida = false;
  this.form.patchValue({ tipoUsuario: tipo });
}

volverASeleccionar() {
  this.animandoSalida = true;
  setTimeout(() => {
    this.mostrarFormulario = false;
    this.tipoUsuario = '';
    this.animandoSalida = false;
  }, 500); // tiempo de fadeOut
}

}
