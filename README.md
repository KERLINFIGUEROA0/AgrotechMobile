# Proyecto Formativo - AgroTech

Sistema integral de gestión agrícola con IoT que permite el control completo de cultivos, lotes, materiales, actividades formativas, sensores en tiempo real, y más. Desarrollado con tecnologías modernas para optimizar la producción agrícola y el aprendizaje.

## Tecnologías Utilizadas

### Backend
- **NestJS**: 11.1.6 (Framework Node.js)
- **TypeScript**: 5.7.3
- **PostgreSQL**: 15 (Base de datos)
- **Redis**: Alpine (Cache)
- **MQTT**: 5.14.1 (Mensajería IoT)
- **TypeORM**: 0.3.26 (ORM)
- **JWT**: Autenticación
- **Node.js**: v22.20.0

### Frontend
- **React**: Framework para interfaz de usuario
- **TypeScript**: Tipado estático

### Infraestructura
- **Docker & Docker Compose**: Contenerización y orquestación
- **MQTT Broker**: Comunicación IoT

### Documentación
- **Astro**: 5.6.1 (Generador de sitio estático)
- **Starlight**: 0.36.3 (Tema de documentación)
- **Mermaid**: Diagramas integrados

## Requisitos Previos

Asegúrate de tener instalados los siguientes programas:

- Git
- Node.js v22.20.0 (incluye npm)
- Docker y Docker Compose

## Instalación y Configuración

### Clonar el Repositorio
```bash
git clone https://github.com/KERLINFIGUEROA0/AgrotechMobile.git
cd AgrotechMobile
```

### Backend
```bash
cd backend
npm install
docker-compose up -d  # Levanta PostgreSQL y Redis
npm run seed          # Inserta usuario administrador
npm run start:dev     # Inicia servidor en modo desarrollo
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Inicia servidor de desarrollo
```

## Documentación Técnica

La documentación completa está disponible en un sitio dedicado construido con Astro y Starlight.

### Ejecutar Documentación Local
```bash
cd documentacion
npm install
npm run dev  # Servidor en http://localhost:4321
```

### Contenido de la Documentación

- **Inicio**: Visión general del sistema y tecnologías
- **Despliegue**: Guías completas de instalación, Docker, variables de entorno y troubleshooting
- **Arquitectura Backend**: Diagramas ER detallados, flujos de datos, casos de uso por roles
- **DTOs**: Referencia completa de validaciones y tipos para todos los módulos
- **Módulos**: Documentación detallada de cada módulo del backend:
  - Actividades (formativas)
  - Cultivos y Producciones
  - Lotes y Surcos
  - Materiales e Inventario
  - Usuarios y Permisos
  - Sensores IoT
  - Ventas y Tratamientos

## Arquitectura General

El sistema sigue una arquitectura modular con:
- **Backend REST API** en NestJS con TypeORM
- **Frontend React** para interfaz de usuario
- **Base de datos PostgreSQL** con 25+ entidades relacionadas
- **Redis** para cache y sesiones
- **MQTT** para comunicación con dispositivos IoT
- **Autenticación JWT** con roles (Administrador, Agricultor, Aprendiz)

## Aplicación Móvil (APK)

El proyecto incluye una aplicación móvil híbrida desarrollada con Capacitor que permite acceder a todas las funcionalidades desde dispositivos Android.
Esta apk solo fue desarrollada para android.

### Repositorio
```bash
git clone https://github.com/KERLINFIGUEROA0/AgrotechMobile.git
```

### Requisitos para Generar APK

- **Node.js** v22.20.0 o superior
- **Java JDK** 11 o superior(recomendada la version 21) (para Android Studio/Gradle)
- **Android Studio** (opcional, pero recomendado para desarrollo)
- **Capacitor CLI** (se instala automáticamente con las dependencias)


# Configuración de Conectividad (Backend)
⚠️ IMPORTANTE: El emulador o dispositivo móvil NO puede acceder a localhost directamente (ya que "localhost" en el móvil es el propio móvil). Debes exponer tu backend a internet.

Opción A: Cloudflare Tunnel (Recomendada/Segura)

Instalar Cloudflared:

Bash

# Windows (PowerShell admin)
winget install --id Cloudflare.cloudflared
# macOS
brew install cloudflare/cloudflare/cloudflared

# Iniciar Backend: 
Asegúrate que tu backend corre en el puerto 3000.
Crear Túnel con:

cloudflared tunnel --url http://localhost:3000

Des pues de crear el tunel dara varias lineas de deberas buscar una liea casi igual a esta:

Copiar URL: Obtendrás una dirección tipo https://random-name.trycloudflare.com.

Cabe recalcar que para usar cludflared cada vez que se reinicie el pc se debe de ejecutar el comando de nuevo para que se cree el tunel, y dara otra url diferente.
y esta se tendra que cambiar en el archivo de configuracion de la app movil.

# Configurar el Endpoint
Ve al archivo frontend/.env y actualiza la variable con la URL que obtuviste en el paso anterior (Cloudflare o IP Local).

Fragmento de código

# Ejemplo con Cloudflare
VITE_BACKEND_URL=https://tu-url-generada.trycloudflare.com

En este archivo se debe de cambiar la url que se genero con el comando de cloudflared, cada vez que se reinicie el tunel dara un URL diferente, tendras que cambiarla siempre que de una diferente, y generar el APK nuevamente para que quede con la configuracion nueva.

# GENERACION DEL APK 

# Instalación y Build Web
Desde la carpeta frontend:


# 1. Instalar dependencias
npm install

# 2. Construir la versión de producción de React (Genera carpeta 'dist')
npm run build

# Sincronización con Capacitor
Este comando copia la carpeta dist al proyecto nativo de Android.

npx cap sync android


# Compilación del APK
No es necesario abrir Android Studio, puedes hacerlo desde la terminal:

# En Windows:

cd android
./gradlew.bat assembleDebug


# En Linux / macOS:

cd android
chmod +x gradlew
./gradlew assembleDebug

✅ Ubicación del APK generado: El archivo listo para instalar estará en: frontend/android/app/build/outputs/apk/debug/app-debug.apk


### Características de la App Móvil

- ✅ **Interfaz optimizada** para pantallas táctiles
- ✅ **Animaciones fluidas** en todos los módulos
- ✅ **Responsive design** que se adapta a diferentes tamaños de pantalla
- ✅ **Offline capabilities** para algunas funcionalidades
- ✅ **Notificaciones push** (en desarrollo)
- ✅ **Soporte completo** para todas las funcionalidades del sistema

