import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  userRole: string | null = null;
  isFadingOut = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole');
    console.log('local storage', this.userRole);
  }

  irAUsuarios() {
    this.isFadingOut = true;
    setTimeout(() => {
      this.router.navigate(['/usuarios']);
    }, 500); // que coincida con el CSS (0.5s)
  }
}
