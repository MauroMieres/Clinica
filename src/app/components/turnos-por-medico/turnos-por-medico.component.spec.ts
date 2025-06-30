import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnosPorMedicoComponent } from './turnos-por-medico.component';

describe('TurnosPorMedicoComponent', () => {
  let component: TurnosPorMedicoComponent;
  let fixture: ComponentFixture<TurnosPorMedicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnosPorMedicoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnosPorMedicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
