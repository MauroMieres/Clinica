# Clínica Web - Sistema de Turnos

## 1. Registro de usuarios

En `/register`, podemos registrarnos indicando si somos **pacientes** o **especialistas**.

![Formulario de registro](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/registro.png)

- Los pacientes podrán loguearse en la aplicación luego de registrarse y confirmar el correo electrónico.
- Los especialistas, además de lo anterior, necesitan ser aprobados por un administrador.

El especialista puede seleccionar su especialidad de las ya cargadas, o ingresar nuevas (solo texto y sin espacios, ejemplo: ingresado, extra).  
Estas pasarán a estar disponibles para futuros registros.

![Especialidades](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/especialidades.png)

**Todos los campos son obligatorios y están validados. Además es necesario comprobar el captcha para realizar el registro.**

![Captcha](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/captcha.png)

---

## 2. Login

En `/login` podremos ingresar a las demás funciones de la clínica:

- Podemos ingresar con un usuario habilitado (chequear requisitos en 1)
- Podemos clickear **autocompletar** e ingresar automáticamente con un paciente
- Podemos desplegar el botón flotante con icono de trueno en la parte inferior izquierda de la pantalla y seleccionar el acceso rápido a la aplicación con un usuario de los listados (se indica el tipo: admin, especialista o paciente)

![Pantalla de login](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/login.png)

---

## 3. Home

En el home tendremos las principales funcionalidades, segmentadas según el tipo de usuario.

- El botón de **"Ir a sección de usuarios"** solo está disponible para administradores.
- Los botones del navbar varían según el tipo de usuario:
  - **Administrador**: Home, Solicitar turnos, Turnos, Perfil
  - **Especialista**: Home, Mis turnos, Perfil
  - **Paciente**: Home, Solicitar turnos, Mis turnos, Perfil

![Home](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/home.png)

---

## 4. Sección de usuarios

- **Crear usuario:** Habilita el mismo formulario de /register, pero agrega la posibilidad de crear usuarios de tipo administrador.
- **Ver:** Te lleva al detalle del usuario seleccionado.

![Usuarios](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/usuarios1.png)

![Usuarios-Detalle](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/usuarios2.png)

---

## 5. Solicitar turnos

Luego de clickear en **"Solicitar turno"** se desplegará un formulario.

- Los administradores pueden cargar turnos para pacientes ya registrados.
- Los pacientes solo pueden tomar turnos para ellos mismos.  
Luego de confirmar el turno, este será visible en /Mis-turnos.

![Solicitar turnos](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/solicitar1.png)

---

## 6. Mis Turnos

En esta sección (solo accesible por paciente y especialistas), se podrán ver los turnos relacionados del usuario logueado:

- El paciente ve los turnos solicitados por él y el estado de los mismos.
- El especialista ve los turnos que se le solicitaron y el estado de los mismos.

Acciones permitidas:
- El paciente puede cancelar el turno dejando una nota siempre y cuando el turno no haya sido marcado como finalizado, rechazado o cancelado.
- El especialista puede aceptar, rechazar, finalizar o cancelar turnos, siempre dejando una nota.
- El paciente puede calificar la atención solo si el turno fue realizado y llenar una encuesta si, además, el especialista dejó una reseña.

![Mis turnos](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/misturnos.png)

---

## 7. Turnos (Administrador)

Esta sección es solo para administradores. Desde aquí puede ver el detalle de todos los turnos de la clínica, filtrar por especialidad o nombre de especialista, y cancelarlos si están en estado solicitado (dejando una nota).

![Turnos admin](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/turnos.png)

---

## 8. Mi perfil

Los usuarios pueden ver la información de su cuenta.  
Los especialistas, aquí pueden cargar sus horarios de atención.

- La hora de inicio y fin está dentro del tiempo de atención de la clínica:
  - Lunes a viernes: 8:00 a 19:00
  - Sábados: 8:00 a 14:00

- La hora de inicio y fin debe ser divisible por la duración de los turnos (mínimo 30 minutos).
  - Ejemplo: 17:00 a 19:00 un lunes, duración 45, es divisible (120/45)

![Mi perfil](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/miperfil1.png)

![Mis horarios de atencion (especialista)](https://jiwshjrecqfnhgnziubk.supabase.co/storage/v1/object/public/imagenes/readme/miperfil2.png)

---


