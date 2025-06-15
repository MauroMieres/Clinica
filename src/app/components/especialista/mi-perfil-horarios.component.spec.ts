import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiPerfilHorariosComponent } from './mi-perfil-horarios.component';

describe('MiPerfilHorariosComponent', () => {
  let component: MiPerfilHorariosComponent;
  let fixture: ComponentFixture<MiPerfilHorariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiPerfilHorariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiPerfilHorariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
