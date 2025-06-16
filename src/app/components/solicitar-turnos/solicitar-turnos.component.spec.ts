import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitarTurnosComponent } from './solicitar-turnos.component';

describe('SolicitarTurnosComponent', () => {
  let component: SolicitarTurnosComponent;
  let fixture: ComponentFixture<SolicitarTurnosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitarTurnosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitarTurnosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
