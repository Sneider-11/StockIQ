# StockIQ 📦

**Sistema Inteligente de Auditoría de Inventarios**  
Grupo Comercial · v2.0.0

---

## ¿Qué es StockIQ?

StockIQ es una aplicación móvil construida con React Native + Expo para gestionar auditorías de inventario en múltiples tiendas. Permite escanear códigos de barras, registrar conteos, detectar diferencias y generar reportes por tienda.

---

## Estructura del proyecto

```
stockiq/
├── App.tsx                          # Punto de entrada y enrutador principal
├── app.json                         # Configuración de Expo
├── package.json
├── tsconfig.json
├── babel.config.js
├── .gitignore
│
└── src/
    ├── constants/
    │   └── data.ts                  # Tipos, tiendas, usuarios, catálogo, clasificaciones
    │
    ├── utils/
    │   └── helpers.ts               # Funciones utilitarias (clasificar, fCOP, ahora, etc.)
    │
    ├── hooks/
    │   └── useAppState.ts           # Estado central de la app (usuarios, registros, navegación)
    │
    ├── components/
    │   └── common/
    │       ├── Avatar.tsx           # Componente de avatar con iniciales
    │       ├── Badge.tsx            # Badge, RolBadge, ClasifBadge
    │       ├── SecHeader.tsx        # Separador de sección con título
    │       └── index.ts             # Exportaciones
    │
    └── screens/
        ├── index.ts                 # Exportaciones de pantallas
        ├── LoginScreen.tsx          # Pantalla de inicio de sesión
        ├── HomeScreen.tsx           # Home SuperAdmin + Home Auditor
        ├── GestionEquipoScreen.tsx  # Crear/eliminar auditores + WhatsApp
        ├── TiendaScreen.tsx         # Dashboard por tienda
        ├── ScannerScreen.tsx        # Escáner de códigos con cámara
        ├── MisRegistrosScreen.tsx   # Lista de registros con filtros
        ├── ResultadosScreen.tsx     # Resultados, gestión y resumen económico
        └── ImportarScreen.tsx       # Carga de catálogo desde Excel (.xlsx)
```

---

## Instalación y ejecución

### Requisitos previos

- Node.js 18+
- npm o yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go en tu teléfono ([iOS](https://apps.apple.com/app/expo-go/id982107779) · [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/stockiq.git
cd stockiq

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npx expo start

# 4. Escanear el QR con Expo Go en tu teléfono
```

### Ejecutar en plataforma específica

```bash
npx expo start --ios      # Simulador iOS (requiere Mac + Xcode)
npx expo start --android  # Emulador Android (requiere Android Studio)
npx expo start --web      # Versión web (funcionalidad limitada)
```

---

## Usuarios y accesos (modo demo)

| Nombre           | Cédula       | Contraseña | Rol          | Tiendas           |
|------------------|--------------|------------|--------------|-------------------|
| Carlos Peñaloza  | 1004807039   | admin123   | Super Admin  | Todas             |
| Edwin Puerto     | 1090491873   | edwin123   | Auditor      | Yamaha            |
| German Torres    | 1090414059   | german123  | Auditor      | Honda             |

> El Super Admin puede crear nuevos auditores desde la app y enviarles las credenciales por WhatsApp.

---

## Tiendas configuradas

| ID        | Nombre             | Color    |
|-----------|--------------------|----------|
| general   | Inventario General | #0F172A  |
| yamaha    | Tienda Yamaha      | #1D4ED8  |
| bajaj     | Tienda Bajaj       | #7C3AED  |
| akt       | Tienda AKT         | #C8372A  |
| honda     | Tienda Honda       | #B45309  |

---

## Funcionalidades principales

### 🔐 Control de acceso
- Solo usuarios registrados por el Super Admin pueden ingresar
- Roles diferenciados: Super Admin y Auditor
- Cada auditor solo ve las tiendas que le fueron asignadas

### 📱 Escáner
- Cámara optimizada para lente 1x (zoom correcto en iPhone)
- Soporte: QR, Code128, Code39, EAN-13, EAN-8, UPC-A
- Reapertura automática tras guardar cada registro
- Búsqueda manual por últimos 6 dígitos o descripción
- Simulador de escaneo para demo sin códigos físicos

### 📊 Clasificación automática
| Estado       | Criterio                        |
|--------------|---------------------------------|
| Sin diferencia | Contado = Stock sistema        |
| Faltante     | Contado < Stock sistema         |
| Sobrante     | Contado > Stock sistema         |
| Conteo cero  | Stock sistema = 0 y se encontró |

### 📋 Registros
- Foto opcional por artículo
- Nota de texto libre
- Filtros por clasificación
- Impacto económico por artículo
- Vista diferenciada auditor vs admin

### 📈 Resultados
- Barra de distribución por clasificación
- Avance del inventario por tienda
- Ranking de auditores por escaneos
- Resumen económico: pérdidas, sobrantes y balance general

### 📂 Carga de catálogo
- Importación de archivos `.xlsx` desde el teléfono
- Formato: sin encabezados, columnas A=ItemID, B=Descripción, C=Ubicación, G=Stock, H=Costo
- Vista previa antes de confirmar
- Catálogo independiente por tienda

### 👥 Gestión de equipo (Super Admin)
- Crear auditores con nombre, cédula, contraseña y tiendas
- Eliminar auditores
- Enviar credenciales automáticamente por WhatsApp

---

## Próximos pasos

- [ ] Backend real con NestJS + PostgreSQL
- [ ] Autenticación JWT con refresh tokens
- [ ] Modo offline con expo-sqlite + sincronización
- [ ] Exportación de informes en Excel y PDF
- [ ] Historial de inventarios anteriores por tienda
- [ ] Notificaciones push al terminar un conteo
- [ ] Dashboard web con React para el admin

---

## Stack tecnológico

| Tecnología         | Uso                          |
|--------------------|------------------------------|
| React Native 0.76  | Framework móvil              |
| Expo SDK 52        | Herramientas y APIs nativas  |
| TypeScript         | Tipado estático              |
| expo-camera        | Escáner de códigos           |
| expo-image-picker  | Captura de fotos             |
| expo-document-picker | Selección de archivos      |
| xlsx               | Lectura de archivos Excel    |
| @expo/vector-icons | Íconos (Ionicons)            |

---

## Licencia

Proyecto privado · Grupo Comercial AudiMeyer  
