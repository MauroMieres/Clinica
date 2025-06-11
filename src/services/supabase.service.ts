import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment.prod';



@Injectable({
  providedIn: 'root' // Esto garantiza que sea singleton
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.apiUrl,
      environment.supabaseKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
