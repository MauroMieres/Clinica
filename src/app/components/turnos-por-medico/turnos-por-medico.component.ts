import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-turnos-por-medico',
  templateUrl: './turnos-por-medico.component.html',
  styleUrl: './turnos-por-medico.component.css',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule]
})
export class TurnosPorMedicoComponent implements OnInit {
  @ViewChild('chartCanvasMedico', { static: false }) chartCanvasMedico!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCanvasFinalizados', { static: false }) chartCanvasFinalizados!: ElementRef<HTMLCanvasElement>;

  // --- Turnos por Médico ---
  turnosPorMedico: { nombreCompleto: string, cantidad: number }[] = [];
  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [{ data: [], label: 'Cantidad de turnos' }] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  // --- Turnos Finalizados por Médico ---
  turnosFinalizadosPorMedico: { nombreCompleto: string, cantidad: number }[] = [];
  barChartFinalizadosData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [{ data: [], label: 'Turnos finalizados' }] };
  barChartFinalizadosOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  especialistas: { id: number, nombre: string, apellido: string }[] = [];
  turnos: any[] = [];
  turnosFinalizados: any[] = [];

  // Filtros
  fechaDesde: string = '';
  fechaHasta: string = '';
  fechaDesdeFinalizados: string = '';
  fechaHastaFinalizados: string = '';

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarDatos();
    await this.cargarDatosFinalizados();
  }

  // --- Cantidad de turnos por médico (todos los estados) ---
  async cargarDatos() {
    // Trae especialistas
    const { data: especialistas } = await this.supabaseService.client
      .from('especialistas')
      .select('id, nombre, apellido');
    if (!especialistas) return;
    this.especialistas = especialistas;

    // Arma query de turnos, filtrando por fechas si corresponde
    let query = this.supabaseService.client
      .from('turnos')
      .select('id, id_especialista, fecha_inicio, especialidades(nombre)');
    if (this.fechaDesde && this.fechaHasta) {
      query = query
        .gte('fecha_inicio', this.fechaDesde)
        .lte('fecha_inicio', this.fechaHasta + 'T23:59:59');
    }
    const { data: turnos } = await query;
    if (!turnos) return;
    this.turnos = turnos;

    // Agrupar por médico
    const agrupados: { [nombreCompleto: string]: number } = {};
    turnos.forEach(turno => {
      const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
      const nombreCompleto = especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico';
      agrupados[nombreCompleto] = (agrupados[nombreCompleto] || 0) + 1;
    });

    // Preparar arrays para tabla y gráfico
    const nombres = Object.keys(agrupados).sort((a, b) => a.localeCompare(b));
    this.turnosPorMedico = nombres.map(nombreCompleto => ({
      nombreCompleto,
      cantidad: agrupados[nombreCompleto]
    }));
    this.barChartData = {
      labels: nombres,
      datasets: [{
        data: nombres.map(n => agrupados[n]),
        label: 'Cantidad de turnos'
      }]
    };
  }

  async aplicarFiltroFechas() {
    await this.cargarDatos();
  }

  exportarExcelTurnosPorMedico() {
    const turnosDetallados = this.turnos
      .map(turno => {
        const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
        return {
          Especialista: especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico',
          Fecha: this.toLocalDate(turno.fecha_inicio),
        };
      })
      .sort((a, b) => a.Especialista.localeCompare(b.Especialista));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(turnosDetallados);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TurnosPorMedico');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'turnos_detallados_por_medico.xlsx');
  }

  exportarPDFTurnosPorMedico() {
    const doc = new jsPDF();
    doc.text('Cantidad de turnos por médico', 14, 18);

    // 1. Gráfico
    const canvas = this.chartCanvasMedico?.nativeElement;
    let finalY = 30;
    if (canvas) {
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', 15, finalY, 180, 60);
      finalY += 70;
    } else {
      doc.text('No se pudo obtener el gráfico.', 15, finalY);
      finalY += 10;
    }

    // 2. Listado detallado debajo
    doc.setFontSize(12);
    doc.text('Detalle de turnos:', 14, finalY);

    const turnosDetallados = this.turnos
      .map(turno => {
        const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
        return {
          nombreCompleto: especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico',
          fecha: this.toLocalDate(turno.fecha_inicio),
          especialidad: turno.especialidad_nombre || '',
        };
      })
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    let yPos = finalY + 6;

    turnosDetallados.forEach(turno => {
      doc.text(
        `${turno.nombreCompleto}    ${turno.fecha}    ${turno.especialidad}`,
        16, yPos
      );
      yPos += 7;
      if (yPos > 280) {
        doc.addPage();
        yPos = 15;
      }
    });

    doc.save('turnos_por_medico.pdf');
  }

  // --- Turnos Finalizados por Médico ---
  async cargarDatosFinalizados() {
    // Trae especialistas si no están cargados
    if (this.especialistas.length === 0) {
      const { data: especialistas } = await this.supabaseService.client
        .from('especialistas')
        .select('id, nombre, apellido');
      if (!especialistas) return;
      this.especialistas = especialistas;
    }

    // Query de turnos FINALIZADOS, filtrando por fechas si corresponde
    let query = this.supabaseService.client
      .from('turnos')
      .select('id, id_especialista, fecha_inicio, estado');
    query = query.eq('estado', 'finalizado');
    if (this.fechaDesdeFinalizados && this.fechaHastaFinalizados) {
      query = query
        .gte('fecha_inicio', this.fechaDesdeFinalizados)
        .lte('fecha_inicio', this.fechaHastaFinalizados + 'T23:59:59');
    }
    const { data: turnosFinalizados } = await query;
    if (!turnosFinalizados) return;
    this.turnosFinalizados = turnosFinalizados;

    // Agrupar por médico
    const agrupados: { [nombreCompleto: string]: number } = {};
    turnosFinalizados.forEach(turno => {
      const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
      const nombreCompleto = especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico';
      agrupados[nombreCompleto] = (agrupados[nombreCompleto] || 0) + 1;
    });

    const nombres = Object.keys(agrupados).sort((a, b) => a.localeCompare(b));
    this.turnosFinalizadosPorMedico = nombres.map(nombreCompleto => ({
      nombreCompleto,
      cantidad: agrupados[nombreCompleto]
    }));
    this.barChartFinalizadosData = {
      labels: nombres,
      datasets: [{
        data: nombres.map(n => agrupados[n]),
        label: 'Turnos finalizados'
      }]
    };
  }

  async aplicarFiltroFechasFinalizados() {
    await this.cargarDatosFinalizados();
  }

  exportarExcelTurnosFinalizadosPorMedico() {
    const turnosDetallados = this.turnosFinalizados
      .map(turno => {
        const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
        return {
          Especialista: especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico',
          Fecha: this.toLocalDate(turno.fecha_inicio),
        };
      })
      .sort((a, b) => a.Especialista.localeCompare(b.Especialista));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(turnosDetallados);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TurnosFinalizadosPorMedico');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'turnos_finalizados_por_medico.xlsx');
  }

  exportarPDFTurnosFinalizadosPorMedico() {
    const doc = new jsPDF();
    doc.text('Cantidad de turnos FINALIZADOS por médico', 14, 18);

    // 1. Gráfico
    const canvas = this.chartCanvasFinalizados?.nativeElement;
    let finalY = 30;
    if (canvas) {
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', 15, finalY, 180, 60);
      finalY += 70;
    } else {
      doc.text('No se pudo obtener el gráfico.', 15, finalY);
      finalY += 10;
    }

    doc.setFontSize(12);
    doc.text('Detalle de turnos finalizados:', 14, finalY);

    const turnosDetallados = this.turnosFinalizados
      .map(turno => {
        const especialista = this.especialistas.find(e => e.id === turno.id_especialista);
        return {
          nombreCompleto: especialista ? `${especialista.nombre} ${especialista.apellido}` : 'Sin médico',
          fecha: this.toLocalDate(turno.fecha_inicio),
        };
      })
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    let yPos = finalY + 6;

    turnosDetallados.forEach(turno => {
      doc.text(
        `${turno.nombreCompleto}    ${turno.fecha}`,
        16, yPos
      );
      yPos += 7;
      if (yPos > 280) {
        doc.addPage();
        yPos = 15;
      }
    });

    doc.save('turnos_finalizados_por_medico.pdf');
  }

  // --- Utilidades de fechas ---
  toLocalDate(utc: string): string {
    const fechaLocal = new Date(utc);
    return fechaLocal.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  }
  toLocalTime(utc: string): string {
    const d = new Date(utc);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

}
