import { Routes } from '@angular/router';
import { AuthGuard } from './components/guards/auth.guard';
import { AdminGuard } from './components/guards/admin.guard';
import { EsEspecialistaGuard } from './components/guards/es-especialista.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, //por ahora redirigimos a register
  { path: 'register', loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent) },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'home', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./components/seccion-usuarios/seccion-usuarios.component').then(m => m.SeccionUsuariosComponent),
    canActivate: [AdminGuard]
  },

  {
    path: 'detalle-usuario',
    loadComponent: () => import('./components/detalle-usuario/detalle-usuario.component').then(m => m.DetalleUsuarioComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'mis-turnos',
    loadComponent: () => import('./components/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent),
  },
  {
    path: 'mi-perfil',
    loadComponent: () => import('./components/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
  },
   {
    path: 'turnos',
    loadComponent: () => import('./components/turnos/turnos.component').then(m => m.TurnosComponent),
  },
  {
    path: 'solicitar-turnos',
    loadComponent: () => import('./components/solicitar-turnos/solicitar-turnos.component').then(m => m.SolicitarTurnosComponent),
  },
  {
    path: 'pacientes',
    loadComponent: () => import('./components/pacientes/pacientes.component').then(m => m.PacientesComponent),
  },
  {
    path: 'logs',
    loadComponent: () => import('./components/logs/logs.component').then(m => m.LogsComponent),
  },
  { path: '**', redirectTo: '/login' },
];
