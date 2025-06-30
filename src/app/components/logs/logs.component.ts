import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ViewChild, ElementRef } from '@angular/core';
import { TurnosPorEspecialidadComponent } from '../turnos-por-especialidad/turnos-por-especialidad.component';
import { TurnosPorMedicoComponent } from '../turnos-por-medico/turnos-por-medico.component';



interface LogIngreso {
  id: number;
  created_at: string;
  user_id: string;
}

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css',
  standalone: true,
  imports: [CommonModule,NgChartsModule,TurnosPorEspecialidadComponent,TurnosPorMedicoComponent]
})
export class LogsComponent implements OnInit {
@ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  logs: LogIngreso[] = [];

  constructor(private supabaseService: SupabaseService) {}

   barChartLabels: string[] = [];
 barChartData: ChartConfiguration<'bar'>['data'] = {
  labels: [],
  datasets: [
    { data: [], label: 'Cantidad de ingresos' }
  ]
};
barChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
  }
};

  

  async ngOnInit() {
    await this.cargarLogs();
  }

  async cargarLogs() {
    const { data, error } = await this.supabaseService.client
      .from('logs_ingresos')
      .select('*')
      .order('created_at', { ascending: false });
    this.logs = data || [];
    this.prepararGrafico();
  }

  prepararGrafico() {
    // Agrupa logs por día local
    const agrupados = this.logs.reduce((acc, log) => {
  const fecha = this.toLocalDate(log.created_at);
  acc[fecha] = (acc[fecha] || 0) + 1;
  return acc;
}, {} as { [fecha: string]: number });

// Ordenar las fechas de menor a mayor
const fechasOrdenadas = Object.keys(agrupados).sort((a, b) => {
  // convertir a Date para ordenarlas bien, por si algún día cambia el formato
  const [diaA, mesA, anioA] = a.split('/');
  const [diaB, mesB, anioB] = b.split('/');
  const dateA = new Date(+anioA, +mesA - 1, +diaA);
  const dateB = new Date(+anioB, +mesB - 1, +diaB);
  return dateA.getTime() - dateB.getTime();
});

this.barChartLabels = fechasOrdenadas;
this.barChartData = {
  labels: fechasOrdenadas,
  datasets: [
    { data: fechasOrdenadas.map(f => agrupados[f]), label: 'Cantidad de ingresos' }
  ]
};

  }

 exportarExcel() {
  const dataExcel = this.logs.map(log => ({
    Usuario: log.user_id,
    Fecha: this.toLocalDate(log.created_at),
    Hora: this.toLocalTime(log.created_at) // Ahora siempre 24hs
  }));
  const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LogsIngresos');
  const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, 'logs_ingresos.xlsx');
}


exportarPDF() {
  const doc = new jsPDF();

  doc.text('Cantidad de ingresos por día', 14, 18);

  // 1. Accedé al canvas del gráfico
  const canvas = this.chartCanvas?.nativeElement;

  if (canvas) {
    // 2. Convertí el canvas a imagen
    const imgData = canvas.toDataURL('image/png', 1.0);

    // 3. Insertá la imagen en el PDF
    // (x, y, width, height) -- ajustá el tamaño a tu gusto
    doc.addImage(imgData, 'PNG', 15, 30, 180, 80);
  } else {
    doc.text('No se pudo obtener el gráfico.', 15, 40);
  }

  doc.save('logs_ingresos.pdf');
}





  // UTC a fecha local (Argentina UTC-3)
  toLocalDate(utc: string): string {
    // Convierte y retorna solo la fecha en formato dd/mm/yyyy
    const fechaLocal = new Date(utc);
    // No hace falta restar 3hs: toLocaleDateString con 'America/Argentina/Buenos_Aires' lo ajusta
    return fechaLocal.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  }
  toLocalTime(utc: string): string {
  const d = new Date(utc);
  //d.setHours(d.getHours() - 3); // UTC-3 Argentina
  // Solo horas y minutos en 24hs
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

}
