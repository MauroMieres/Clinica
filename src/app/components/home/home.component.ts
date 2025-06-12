import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common'; // ← IMPORTANTE
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, RouterLink], // ← Agregá NgIf acá
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  userRole: string | null = null;

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole');
    console.log('local storage', this.userRole);
  }
}
