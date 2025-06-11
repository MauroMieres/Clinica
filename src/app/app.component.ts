import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { Router } from '@angular/router';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule,RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'Clinica';
  isLoggedIn = false;
  userRole: string | null = null;

 constructor(
  private supabaseService: SupabaseService,
  private router: Router // 👈 añadí esta línea
) {}



    ngOnInit() {
    this.supabaseService.client.auth.getSession().then(({ data }) => {
      this.isLoggedIn = !!data.session;
      this.userRole = localStorage.getItem('userRole');
    });

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.isLoggedIn = !!session;
    });
  }


  
  logout() {
  this.supabaseService.client.auth.signOut().then(() => {
    this.isLoggedIn = false;
    this.router.navigate(['/login']);
    
  });
}

}
