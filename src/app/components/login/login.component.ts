import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, CommonModule],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async login() {
    this.isLoading = true;

    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email: this.username,
      password: this.password,
    });

    if (error || !data.session) {
      if (error?.message.includes('Invalid login credentials')) {
        this.errorMessage = 'Las credenciales son inválidas';
      } else if (error?.message.includes('Email not confirmed')) {
        this.errorMessage = 'Debes confirmar tu correo electrónico antes de iniciar sesión';
      } else {
        this.errorMessage = 'Ocurrió un error: ' + (error?.message || 'No se pudo iniciar sesión');
      }
      this.isLoading = false;
      return;
    }

    const session = data.session;
    const user = session.user;
    const userId = user.id;

    // Verificar paciente
    const { data: paciente } = await this.supabaseService.client
      .from('pacientes')
      .select('*')
      .eq('id_auth_user', userId)
      .maybeSingle();

    if (paciente) {
      localStorage.setItem('userRole', 'paciente');
      localStorage.setItem('user', JSON.stringify({ id: paciente.id, rol: 'paciente' }));
      this.router.navigate(['/home']);
      return;
    }

    // Verificar especialista
    const { data: especialista } = await this.supabaseService.client
      .from('especialistas')
      .select('*')
      .eq('id_auth_user', userId)
      .maybeSingle();

    if (especialista) {
      if (!especialista.especialista_activo) {
        this.errorMessage = 'Tu cuenta de especialista aún no fue activada por un administrador o ha sido desactivada';
        await this.supabaseService.client.auth.signOut();
        this.isLoading = false;
        return;
      }

      localStorage.setItem('userRole', 'especialista');
      localStorage.setItem('user', JSON.stringify({ id: especialista.id, rol: 'especialista' }));
      this.router.navigate(['/home']);
      return;
    }

    // Verificar administrador
    const { data: admin } = await this.supabaseService.client
      .from('administradores')
      .select('*')
      .eq('id_auth_user', userId)
      .maybeSingle();

    if (admin) {
      if (!admin.admin_activo) {
        this.errorMessage = 'Tu cuenta de admin ha sido desactivada';
        await this.supabaseService.client.auth.signOut();
        this.isLoading = false;
        return;
      }

      localStorage.setItem('userRole', 'admin');
     localStorage.setItem('user', JSON.stringify({ id: admin.id, rol: 'admin' }));
      this.router.navigate(['/home']);
      return;
    }

    this.errorMessage = 'No se pudo determinar el tipo de usuario';
    await this.supabaseService.client.auth.signOut();
    this.isLoading = false;
  }

  autocompletar() {
    this.username = 'mauronicolasmieres@gmail.com';
    this.password = 'cacatua';
  }

  mostrarAccesos = false;

  accesosRapidos = [
    { email: 'jejefo5321@lewou.com', password: 'cacatua' , tipo: 'Paciente' },
    { email: 'tisek95069@hosliy.com', password: 'cacatua' , tipo: 'Paciente' },
    { email: 'mauronicolasmieres@gmail.com', password: 'cacatua', tipo: 'Paciente' },
    { email: 'sopiye2457@jio1.com', password: 'cacatua' , tipo: 'Especialista' },
    { email: 'fiferow558@nab4.com', password: 'cacatua' , tipo: 'Especialista' },
    { email: 'mnmtwittermnm@gmail.com', password: 'cacatua' , tipo: 'Administrador' },
  ];

  loginRapido(usuario: { email: string, password: string }) {
    this.username = usuario.email;
    this.password = usuario.password;
    setTimeout(() => this.login(), 100); 
  }
}
