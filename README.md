# Backend API  
Sistema de Gestión de Emergencias (Beta)

PolBol es una API RESTful diseñada para gestionar **incidentes de emergencia**, **usuarios (civiles y policías)**, **tipos de emergencia**, y **ubicaciones**, permitiendo una comunicación centralizada entre ciudadanos y autoridades policiales.  
Este proyecto está construido con **Node.js**, **Express**, **MongoDB**, y usa JWT para autenticación.

---

## Características Principales

### Gestión de Usuarios
- Registro e inicio de sesión
- Roles: `civil`, `police`, `admin`
- Hash de contraseña (bcrypt)
- Control de estado del usuario (activo/inactivo)

### Gestión de Incidentes
- Crear incidentes por civiles
- Asignación de policías
- Control de estados: `pendiente`, `en_camino`, `resuelto`
- Geolocalización usando formato GeoJSON
- Prioridad automática según tipo de emergencia
- Historial y logs internos

### Tipos de Emergencia
Permite administrar:
- Nombre
- Código único
- Nivel de prioridad
- Si requieren movilización (patrulla, ambulancia, etc.)
- Descripción

### Ubicaciones
- Manejo de coordenadas
- Guardado de direcciones
- Uso en incidentes y perfiles de usuario

### Seguridad y Middlewares
- Autenticación JWT
- Rate limiting antibloqueo
- Validaciones de entrada
- Manejo global de errores

---
