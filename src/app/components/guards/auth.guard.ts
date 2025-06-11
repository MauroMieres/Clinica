import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    const { data } = await this.supabaseService.client.auth.getSession();
    const user = data?.session?.user;

    if (user && user.email_confirmed_at) {
      return true;
    }

    // Redirigir al login si no está logueado o el email no está confirmado
    console.log("Protegido con guard, redirijo a /login");
    this.router.navigate(['/login']);
    return false;
  }
}
