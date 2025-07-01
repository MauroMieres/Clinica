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
  @Input() historiaId?: number | null;


ngOnChanges(changes: SimpleChanges): void {
  if (changes['historiaId'] && changes['historiaId'].currentValue) {
    this.cargarHistoriaClinica(undefined, changes['historiaId'].currentValue);
  } else if (changes['pacienteId'] && changes['pacienteId'].currentValue) {
    this.cargarHistoriaClinica(changes['pacienteId'].currentValue);
  }
}


async cargarHistoriaClinica(pacienteId?: number | string, historiaId?: number | null) {
  this.loading = true;
  let query = this.supabaseService.client
    .from('historia_clinica')
    .select(`
      id, fecha_atencion, altura, peso, temperatura, presion,
      especialista_id,
      especialistas:especialista_id (nombre, apellido),
      dinamicos:historia_clinica_dinamicos (clave, valor)
    `);

  if (historiaId) {
    query = query.eq('id', historiaId);
  } else if (pacienteId) {
    query = query.eq('paciente_id', pacienteId);
  } else {
    this.atenciones = [];
    this.loading = false;
    return;
  }

  query = query.order('fecha_atencion', { ascending: false });
  const { data, error } = await query;

  if (!error) this.atenciones = data || [];
  this.loading = false;
}




  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
  if (this.historiaId) {
    await this.cargarHistoriaClinica(undefined, this.historiaId);
  } else if (this.pacienteId) {
    await this.cargarHistoriaClinica(this.pacienteId);
  }
}


}
