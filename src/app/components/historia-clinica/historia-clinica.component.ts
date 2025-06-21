import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { SupabaseService } from '../../../services/supabase.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports:[FormsModule,CommonModule],
  templateUrl: './historia-clinica.component.html',
  styleUrls: ['./historia-clinica.component.css'],
})
export class HistoriaClinicaComponent implements OnInit, OnChanges {

  @Input() pacienteId!: number | string;
  atenciones: any[] = [];
  loading = true;

ngOnChanges(changes: SimpleChanges): void {
  if (changes['pacienteId'] && changes['pacienteId'].currentValue) {
    this.cargarHistoriaClinica(changes['pacienteId'].currentValue);
  }
}

async cargarHistoriaClinica(pacienteId: number | string) {
  this.loading = true;
  const { data, error } = await this.supabaseService.client
    .from('historia_clinica')
    .select(`
      id, fecha_atencion, altura, peso, temperatura, presion,
      especialista_id,
      especialistas:especialista_id (nombre, apellido),
      dinamicos:historia_clinica_dinamicos (clave, valor)
    `)
    .eq('paciente_id', pacienteId)
    .order('fecha_atencion', { ascending: false });

  if (!error) this.atenciones = data || [];
  this.loading = false;
}



  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    if (!this.pacienteId) return;
    const { data, error } = await this.supabaseService.client
      .from('historia_clinica')
      .select(`
        id, fecha_atencion, altura, peso, temperatura, presion,
        especialista_id,
        especialistas:especialista_id (nombre, apellido),
        dinamicos:historia_clinica_dinamicos (clave, valor)
      `)
      .eq('paciente_id', this.pacienteId)
      .order('fecha_atencion', { ascending: false });

    if (!error) this.atenciones = data || [];
    this.loading = false;
  }
}
