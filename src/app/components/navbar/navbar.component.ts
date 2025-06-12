import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  userRole: string | null = null;

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole');
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
  }
}
