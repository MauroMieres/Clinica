import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-turnos-por-especialidad',
  templateUrl: './turnos-por-especialidad.component.html',
  styleUrl: './turnos-por-especialidad.component.css',
  standalone: true,
  imports: [CommonModule, NgChartsModule]
})
export class TurnosPorEspecialidadComponent implements OnInit {
  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [{ data: [], label: 'Cantidad de turnos' }] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private supabaseService: SupabaseService) {}

  especialidadesConCantidad: { nombre: string, cantidad: number }[] = [];


  async ngOnInit() {
   await this.cargarTurnosPorDia();
    await this.cargarTurnosYEspecialidades();
  }

async cargarTurnos() {
  const { data, error } = await this.supabaseService.client
    .from('turnos')
    .select('id, id_especialidad, especialidades(nombre)');
  if (!data) return;

  // Agrupar por nombre de especialidad
  const agrupados: { [nombre: string]: number } = {};
  data.forEach(turno => {
    let nombre = 'Sin especialidad';
    if (Array.isArray(turno.especialidades) && turno.especialidades.length > 0) {
      nombre = turno.especialidades[0].nombre;
    }
    console.log('Turno:', turno, 'Especialidad detectada:', nombre);
    agrupados[nombre] = (agrupados[nombre] || 0) + 1;
  });

  // Ordenar alfabéticamente los nombres (opcional)
  const nombres = Object.keys(agrupados).sort((a, b) => a.localeCompare(b));

  this.barChartData = {
    labels: nombres,
    datasets: [{
      data: nombres.map(n => agrupados[n]),
      label: 'Cantidad de turnos'
    }]
  };
}

async cargarTurnosYEspecialidades() {
  // 1. Traer especialidades y mapear por id para lookup rápido
  const { data: especialidades, error: errorEsp } = await this.supabaseService.client
    .from('especialidades')
    .select('id, nombre');
  if (!especialidades) return;

  const especialidadesMap: { [id: number]: string } = {};
  especialidades.forEach(e => {
    especialidadesMap[e.id] = e.nombre;
  });

  // 2. Traer turnos
  const { data: turnos, error: errorTurnos } = await this.supabaseService.client
    .from('turnos')
    .select('id, id_especialidad');
  if (!turnos) return;

  // 3. Agrupar por nombre de especialidad
  const agrupados: { [nombre: string]: number } = {};
  turnos.forEach(turno => {
    const nombreEsp = especialidadesMap[turno.id_especialidad] || 'Sin especialidad';
    agrupados[nombreEsp] = (agrupados[nombreEsp] || 0) + 1;
  });

  // 4. Armar labels/datasets para el gráfico
  const nombres = Object.keys(agrupados).sort((a, b) => a.localeCompare(b));
  this.barChartData = {
    labels: nombres,
    datasets: [{
      data: nombres.map(n => agrupados[n]),
      label: 'Cantidad de turnos'
    }]
  };

  // (Opcional: mostrar en texto)
  this.especialidadesConCantidad = nombres.map(nombre => ({
    nombre,
    cantidad: agrupados[nombre]
  }));
}




exportarExcelTurnos() {
  // Prepara los datos para el Excel
  const dataExcel = this.barChartData.labels!.map((nombre, idx) => ({
    Especialidad: nombre,
    'Cantidad de turnos': this.barChartData.datasets[0].data[idx]
  }));

  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TurnosPorEspecialidad');
  const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'turnos_por_especialidad.xlsx');
}

exportarPDFTurnos() {
    const doc = new jsPDF();

    doc.text('Cantidad de turnos por especialidad', 14, 18);

    // Acceder al canvas
    const canvas = this.chartCanvas?.nativeElement;

    if (canvas) {
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', 15, 30, 180, 80);
    } else {
      doc.text('No se pudo obtener el gráfico.', 15, 40);
    }

    doc.save('turnos_por_especialidad.pdf');
  }

//turnos por dia

 @ViewChild('chartCanvasPorDia', { static: false }) chartCanvasPorDia!: ElementRef<HTMLCanvasElement>;
  turnosPorDia: { fecha: string, cantidad: number }[] = [];
  barChartDataPorDia: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ data: [], label: 'Turnos por día' }]
  };

async cargarTurnosPorDia() {
  const { data, error } = await this.supabaseService.client
    .from('turnos')
    .select('id, fecha_inicio');

  if (!data) return;

  // Agrupa por fecha (formato yyyy-mm-dd)
  const agrupados: { [fecha: string]: number } = {};
  data.forEach(turno => {
    const fecha = new Date(turno.fecha_inicio).toISOString().split('T')[0];
    agrupados[fecha] = (agrupados[fecha] || 0) + 1;
  });

  // Convertir a array ordenado
  const fechas = Object.keys(agrupados).sort();
  this.turnosPorDia = fechas.map(fecha => ({
    fecha,
    cantidad: agrupados[fecha]
  }));

  // Prepara datos para el gráfico
  this.barChartDataPorDia = {
    labels: fechas,
    datasets: [{
      data: fechas.map(f => agrupados[f]),
      label: 'Turnos por día'
    }]
  };
}



exportarExcelTurnosPorDia() {
    const dataExcel = this.turnosPorDia.map(t => ({
      'Fecha': t.fecha,
      'Cantidad de turnos': t.cantidad
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TurnosPorDia');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'turnos_por_dia.xlsx');
  }

  exportarPDFTurnosPorDia() {
  const doc = new jsPDF();
  doc.text('Turnos por día', 14, 18);

  // Solo el gráfico:
  const canvas = this.chartCanvasPorDia?.nativeElement;
  if (canvas) {
    const imgData = canvas.toDataURL('image/png', 1.0);
    // Insertar imagen debajo del título
    doc.addImage(imgData, 'PNG', 15, 30, 180, 80);
  } else {
    doc.text('No se pudo obtener el gráfico.', 15, 40);
  }

  doc.save('turnos_por_dia.pdf');
}
}


