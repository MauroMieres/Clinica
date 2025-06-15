import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

export const EsEspecialistaGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: userData } = await supabase.client.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    router.navigate(['/login']);
    return false;
  }

  const { data: especialista } = await supabase.client
    .from('especialistas')
    .select('id')
    .eq('id_auth_user', userId)
    .maybeSingle();

  if (!especialista) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
