import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  imports: [ReactiveFormsModule, CommonModule]
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  tipoUsuario = '';
  especialidades: string[] = [];
  errorMessage = '';
  mostrarAdmin: boolean = false;

  foto1_file: File | null = null;
  foto2_file: File | null = null;

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerEspecialidades();

    this.form = this.fb.group({
      tipoUsuario: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)]],
      apellido: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(99)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{1,10}$/)]],
      obraSocial: [''],
      especialidadSeleccionada: [''],
      especialidadPersonalizada: ['']
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
          this.especialidades.push('Otra');
        }
      });
  }


  validarEspecialidad(control: AbstractControl): ValidationErrors | null {
    const tipo = this.tipoUsuario;
    const seleccionada = control.get('especialidadSeleccionada')?.value;
    const personalizada = control.get('especialidadPersonalizada')?.value;

    if (tipo !== 'especialista') return null;

    if (!seleccionada && !personalizada) {
      return { especialidadRequerida: true };
    }

    if (seleccionada === 'Otra' && (!personalizada || !/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/.test(personalizada))) {
      return { especialidadInvalida: true };
    }

    return null;
  }

  onTipoUsuarioChange(tipo: string) {
    this.tipoUsuario = tipo;

    const obraSocial = this.form.get('obraSocial');
    const especialidadSeleccionada = this.form.get('especialidadSeleccionada');
    const especialidadPersonalizada = this.form.get('especialidadPersonalizada');

    obraSocial?.clearValidators();
    especialidadSeleccionada?.clearValidators();
    especialidadPersonalizada?.clearValidators();

    if (tipo === 'paciente') {
      obraSocial?.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)
      ]);
    }

    if (tipo === 'especialista') {
      especialidadSeleccionada?.setValidators([Validators.required]);
      especialidadSeleccionada?.valueChanges.subscribe(value => {
        if (value === 'Otra') {
          especialidadPersonalizada?.setValidators([
            Validators.required,
            Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/)
          ]);
        } else {
          especialidadPersonalizada?.clearValidators();
          especialidadPersonalizada?.reset();
        }
        especialidadPersonalizada?.updateValueAndValidity();
      });
    }

    obraSocial?.updateValueAndValidity();
    especialidadSeleccionada?.updateValueAndValidity();
    especialidadPersonalizada?.updateValueAndValidity();
    this.form.updateValueAndValidity();
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
    if (this.form.invalid) return false;

    if (this.tipoUsuario === 'paciente') {
      return !!(this.foto1_file && this.foto2_file);
    }

    if (this.tipoUsuario === 'especialista' || this.tipoUsuario === 'administrador') {
      return !!this.foto1_file;
    }

    return false;
  }

  async register() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (
      (this.tipoUsuario === 'paciente' && (!this.foto1_file || !this.foto2_file)) ||
      ((this.tipoUsuario === 'especialista' || this.tipoUsuario === 'administrador') && !this.foto1_file)
    ) {
      this.errorMessage = 'Por favor, subí todas las fotos requeridas antes de continuar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password } = this.form.value;

    const { data, error } = await this.supabaseService.client.auth.signUp({ email, password });

    if (error) {
      this.isLoading = false;
      if (error.message.toLowerCase().includes('user already registered')) {
        this.errorMessage = 'Este correo ya está registrado en el sistema.';
      } else {
        this.errorMessage = 'Error al registrar el usuario: ' + error.message;
      }
      return;
    }

    const { foto1_url, foto2_url } = await this.saveFile(email);

    if (data?.user) {
      const ok = await this.saveUserData(data.user.id, foto1_url, foto2_url);
      if (!ok) {
        this.isLoading = false;
        return;
      }
      this.router.navigate(['/login']);
    }

    this.isLoading = false;
  }

  async saveUserData(userId: string, foto1_url: string | null, foto2_url: string | null): Promise<boolean> {
  const values = this.form.value;

  try {
    // Validar si el email ya existe en alguna de las 3 tablas
    const tablas = ['pacientes', 'especialistas', 'administradores'];
    for (const tabla of tablas) {
      const { data, error } = await this.supabaseService.client
        .from(tabla)
        .select('email')
        .eq('email', values.email)
        .maybeSingle();

      if (data) {
        this.errorMessage = `El correo ya está registrado.`;
        return false;
      }
    }

    // Guardar según el tipo de usuario
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

      case 'especialista':
        const especialidadFinal = values.especialidadSeleccionada === 'Otra'
          ? values.especialidadPersonalizada
          : values.especialidadSeleccionada;

        if (values.especialidadSeleccionada === 'Otra' && values.especialidadPersonalizada) {
          await this.supabaseService.client.from('especialidades').insert([
            { nombre: values.especialidadPersonalizada }
          ]);
        }

        await this.supabaseService.client.from('especialistas').insert([{
          id_auth_user: userId,
          nombre: values.nombre,
          apellido: values.apellido,
          edad: values.edad,
          dni: values.dni,
          email: values.email,
          foto_url: foto1_url,
          especialidad: especialidadFinal,
          especialista_activo: false
        }]);
        break;

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

  esCampoValido(campo: string): boolean {
    return this.form.get(campo)?.invalid && this.form.get(campo)?.touched || false;
  }
}
