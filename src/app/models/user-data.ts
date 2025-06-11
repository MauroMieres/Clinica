export interface UserData {
    //campos compartidos por todos
  email: string ;
  password: string ;
  name: string ;
  last_name: string ;
  age: number ;
  dni: string ;
  avatar1_url: File; //todos

  //campos pacientes
  avatar2_url: File | null; 
  obraSocial: string;
  paciente_activo : boolean ;

  //campos especialistas
  especialidad: string ;
  especialista_activo : boolean;

  //campos admin
  admin_activo : boolean ;
  }
  