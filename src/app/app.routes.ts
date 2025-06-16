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
  path: 'mi-perfil',
  loadComponent: () => import('./components/especialista/mi-perfil-horarios.component').then(m => m.MiPerfilHorariosComponent),
  canActivate: [EsEspecialistaGuard] 
},
 {
  path: 'mis-turnos',
  loadComponent: () => import('./components/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent),
},
    { path: '**', redirectTo: '/login' },
];
