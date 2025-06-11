import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const { data: sessionData } = await this.supabaseService.client.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user || !user.email_confirmed_at) {
      console.warn('🔒 Usuario no logueado o email no confirmado. Redirigiendo a login.');
      this.router.navigate(['/home']);
      return false;
    }

    // Buscar si está en la tabla administradores y está activo
    const { data: adminData, error } = await this.supabaseService.client
      .from('administradores')
      .select('admin_activo')
      .eq('email', user.email)
      .maybeSingle();

    if (error || !adminData || adminData.admin_activo !== true) {
      console.warn('⛔ No tiene permisos de administrador o admin_activo = false.');
      this.router.navigate(['/home']);
      return false;
    }

    // Si pasa todas las validaciones
    return true;
  }
}
