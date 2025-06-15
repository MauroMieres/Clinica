import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { esEspecialistaGuard } from './es-especialista.guard';

describe('esEspecialistaGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => esEspecialistaGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
