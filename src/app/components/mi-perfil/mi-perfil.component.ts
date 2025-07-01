import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../../services/supabase.service';
import { CommonModule } from '@angular/common';
import { NgIf } from '@angular/common';
import { MiPerfilHorariosComponent } from '../especialista/mi-perfil-horarios.component';
import Swal from 'sweetalert2';
import { HistoriaClinicaComponent } from '../historia-clinica/historia-clinica.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, NgIf, MiPerfilHorariosComponent, HistoriaClinicaComponent, FormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {
  user: any = null;
  userRole: string = '';
  especialidadesDelEspecialista: string[] = [];
  verHistoria = false;

  atenciones: any[] = [];
  especialidadSeleccionada: string = '';
  especialidadesDelPaciente: string[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.userRole = localStorage.getItem('userRole') || '';
    const userId = localUser.id;

    console.log('🟡 Usuario desde localStorage:', localUser);
    console.log('🟡 Rol desde localStorage:', this.userRole);

    let table = '';
    switch (this.userRole) {
      case 'paciente':
        table = 'pacientes';

        // 1. Traer atenciones
        const { data: dataAtenciones, error: errorAtenciones } = await this.supabaseService.client
          .from('historia_clinica')
          .select('*, historia_clinica_dinamicos(*)')
          .eq('paciente_id', userId)
          .order('fecha_atencion', { ascending: false });

        // 2. Traer especialidades
        const { data: dataEspecialidades, error: errorEspecialidades } = await this.supabaseService.client
          .from('especialidades')
          .select('id, nombre');

        if (errorAtenciones) {
          console.error('❌ Error al obtener atenciones:', errorAtenciones);
          this.atenciones = [];
          return;
        }
        if (errorEspecialidades) {
          console.error('❌ Error al obtener especialidades:', errorEspecialidades);
          this.atenciones = [];
          return;
        }

        // 3. Hacer el match manual
        const especialidadesMap = new Map<number, string>();
        (dataEspecialidades || []).forEach((esp: any) => especialidadesMap.set(esp.id, esp.nombre));

        this.atenciones = (dataAtenciones || []).map(a => ({
          ...a,
          especialidad_nombre: especialidadesMap.get(a.id_especialidad) || ''
        }));

        // LOG
        console.log('📋 Historias clínicas encontradas para el paciente:', this.atenciones);

        this.especialidadesDelPaciente = Array.from(new Set(
          this.atenciones.map(a => a.especialidad_nombre).filter(Boolean)
        ));

        break;

      case 'especialista':
        table = 'especialistas';
        break;
      case 'admin':
      case 'administrador':
        table = 'administradores';
        break;
    }

    try {
      console.log('🔍 Tabla que se consulta:', table);
      console.log('🔍 ID que se consulta:', userId);

      const { data, error } = await this.supabaseService.client
        .from(table)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error al obtener usuario:', error);
      } else if (!data) {
        console.warn('⚠️ No se encontró usuario con ese ID en la tabla', table);
      } else {
        this.user = data;
        console.log('✅ Usuario cargado:', this.user);
      }

      // Si es especialista, obtener especialidades
      if (this.userRole === 'especialista') {
        const { data: relaciones } = await this.supabaseService.client
          .from('especialista_especialidad')
          .select('especialidades (nombre)')
          .eq('especialista_id', userId);

        this.especialidadesDelEspecialista = relaciones?.map((r: any) => r.especialidades?.nombre) || [];
        console.log('📘 Especialidades:', this.especialidadesDelEspecialista);
      }

    } catch (e) {
      console.error('❌ Excepción al cargar perfil:', e);
    }
  }

  verHistoriaClinica() {
    this.verHistoria = !this.verHistoria;
  }

  get atencionesFiltradas() {
    if (!this.especialidadSeleccionada) return this.atenciones;
    return this.atenciones.filter(a => a.especialidad_nombre === this.especialidadSeleccionada);
  }

  async exportarHistoriaPDF() {
    const doc = new jsPDF();

    const imgLogo = 'https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/sitioWeb/clinica_logo.png';

    doc.addImage(imgLogo, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('INFORME DE ATENCIONES MÉDICAS', 50, 20);
    doc.setFontSize(12);
    doc.text('Clínica MM', 50, 27); 
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 50, 34);

    doc.setFontSize(11);
    let y = 48;
    doc.text(`Paciente: ${this.user.nombre} ${this.user.apellido}`, 14, y);
    doc.text(`DNI: ${this.user.dni || ''}`, 14, y + 7);
    if (this.user.obra_social) doc.text(`Obra Social: ${this.user.obra_social}`, 14, y + 14);

    // --- DATOS TABLA ---
    const data: any[][] = [];  // <-- TIPADO CORRECTO

    this.atencionesFiltradas.forEach(a => {
      data.push([
        a.fecha_atencion ? new Date(a.fecha_atencion).toLocaleString() : '',
        a.especialidad_nombre || '',
        a.altura || '',
        a.peso || '',
        a.temperatura || '',
        a.presion || ''
      ]);
      if (a.historia_clinica_dinamicos && a.historia_clinica_dinamicos.length) {
        const textoDinamicos = a.historia_clinica_dinamicos
          .map((d: any) => `${d.clave}: ${d.valor}`)
          .join('  |  ');
        data.push([
          { content: `Datos adicionales: ${textoDinamicos}`, colSpan: 7, styles: { fontStyle: 'italic', textColor: [100,100,100] } }
        ]);
      }
    });

    autoTable(doc, {
      head: [[
        'Fecha', 'Especialidad', 'Altura', 'Peso', 'Temp.', 'Presión'
      ]],
      body: data,
      startY: y + 22,
      styles: { fontSize: 10 },
      didParseCell: (tableData) => {
  const raw: any = tableData.cell.raw;
  if (raw?.colSpan === 7) {
    tableData.cell.styles.fillColor = [245, 245, 245];
  }
}
    });

    doc.save(`HistoriaClinica_${this.user.apellido}_${this.user.nombre}.pdf`);
  }
}
