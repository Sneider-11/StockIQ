import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppState } from './src/hooks/useAppState';
import { getRolEnTienda } from './src/utils/helpers';
import { ThemeProvider } from './src/context/ThemeContext';
import {
  LoginScreen,
  HomeSuperAdminScreen,
  HomeAdminScreen,
  HomeContadorScreen,
  GestionEquipoScreen,
  GestionTiendasScreen,
  TiendaScreen,
  ScannerScreen,
  MisRegistrosScreen,
  ResultadosScreen,
  ImportarScreen,
  SobrantesSinStockScreen,
  PerfilScreen,
  ReporteAuditoriaScreen,
} from './src/screens';

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const state = useAppState();
  const {
    cargando,
    tiendas,
    usuario, usuarios, pantalla, tiendaActiva, registros, catalogos,
    login, logout,
    navTienda, navScanner, navRegistros, navMisRegistros, navResultados, navImportar, navSobrantes, navPerfil,
    volverATienda, volverAHome,
    setPantalla,
    agregarTienda, editarTienda, eliminarTienda,
    agregarUsuario, editarUsuario, eliminarUsuario,
    agregarRegistro, eliminarRegistro, editarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
    limpiarRegistrosTienda,
    agregarSobrante, eliminarSobrante, editarSobrante, getSobrantesTienda,
    confirmarCero, desconfirmarCero, getConfirmadosCero,
    reiniciarInventario,
    toggleModoInventario,
  } = state;

  // Derivados (seguros de calcular siempre, incluso si usuario es null)
  const esSuperAdmin    = usuario?.rol === 'SUPERADMIN';
  const esAdmin         = usuario?.rol === 'ADMIN' || esSuperAdmin;
  const rolEnTienda     = tiendaActiva && usuario ? getRolEnTienda(usuario, tiendaActiva.id) : (usuario?.rol ?? 'CONTADOR');
  const esAdminEnTienda = rolEnTienda === 'ADMIN' || rolEnTienda === 'SUPERADMIN';

  // Siempre leer el estado VIVO de la tienda activa desde el array (para detectar cambios de modo)
  const tiendaActivaLive = tiendaActiva
    ? (tiendas.find(t => t.id === tiendaActiva.id) ?? tiendaActiva)
    : null;

  // ── Kick-out reactivo: si la tienda cambia a OFFLINE mientras el usuario está dentro ──
  // DEBE estar antes de cualquier return condicional (Rules of Hooks)
  useEffect(() => {
    if (!tiendaActivaLive || esAdminEnTienda) return;
    if (tiendaActivaLive.modoInventario === 'OFFLINE') {
      volverAHome();
      Alert.alert(
        'Inventario cerrado',
        `El inventario de "${tiendaActivaLive.nombre}" fue cerrado por ${tiendaActivaLive.cerradoPor ?? 'el administrador'}.\n\nContacta al administrador para reactivarlo.`,
        [{ text: 'Entendido', style: 'default' }],
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiendas, tiendaActiva]);

  // ── Pantalla de carga ────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // ── Sin sesión ──────────────────────────────────────────────────────────────
  if (!usuario) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen usuarios={usuarios} onLogin={login} />
      </>
    );
  }

  // Bloquear usuarios inactivos
  if (usuario.activo === false) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen
          usuarios={usuarios}
          onLogin={login}
          mensajeExtra="Tu cuenta está inactiva. Contacta al administrador."
        />
      </>
    );
  }

  // ── Perfil ─────────────────────────────────────────────────────────────────
  if (pantalla === 'perfil') {
    return (
      <>
        <StatusBar style="light" />
        <PerfilScreen
          usuario={usuario}
          registros={registros}
          tiendas={tiendas}
          onCambiarPass={nueva => editarUsuario(usuario.id, { pass: nueva })}
          onActualizarFoto={uri => editarUsuario(usuario.id, { fotoUri: uri })}
          onEliminarFoto={() => editarUsuario(usuario.id, { fotoUri: undefined })}
          onLogout={logout}
          onBack={() => setPantalla(tiendaActiva ? 'tienda' : 'home')}
        />
      </>
    );
  }

  // ── Gestión de equipo — desde home (SuperAdmin) o desde tienda (Admin/SuperAdmin) ──
  if (pantalla === 'equipo' && esAdminEnTienda) {
    return (
      <>
        <StatusBar style="dark" />
        <GestionEquipoScreen
          usuarioActual={usuario}
          usuarios={usuarios}
          tiendas={tiendas}
          // Si viene desde una tienda, filtramos el equipo a esa tienda
          tiendaFiltro={tiendaActiva ?? undefined}
          onAgregar={agregarUsuario}
          onEditar={editarUsuario}
          onEliminar={eliminarUsuario}
          onVolver={() => setPantalla(tiendaActiva ? 'tienda' : 'home')}
        />
      </>
    );
  }

  // ── Gestión de tiendas (solo SUPERADMIN) ────────────────────────────────────
  if (pantalla === 'tiendas' && esSuperAdmin) {
    return (
      <>
        <StatusBar style="dark" />
        <GestionTiendasScreen
          tiendas={tiendas}
          onAgregar={agregarTienda}
          onEditar={editarTienda}
          onEliminar={eliminarTienda}
          onVolver={() => setPantalla('home')}
        />
      </>
    );
  }

  // ── Interior de tienda ──────────────────────────────────────────────────────
  if (pantalla === 'tienda' && tiendaActivaLive) {
    // No-admins bloqueados si la tienda está OFFLINE
    if (tiendaActivaLive.modoInventario === 'OFFLINE' && !esAdminEnTienda) {
      return <InventarioCerradoScreen tienda={tiendaActivaLive} onVolver={volverAHome} />;
    }

    return (
      <>
        <StatusBar style="light" />
        <TiendaScreen
          tienda={tiendaActivaLive}
          usuario={{ ...usuario, rol: rolEnTienda }}
          usuarios={usuarios}
          registros={registros}
          catalogos={catalogos}
          sobrantesTienda={getSobrantesTienda(tiendaActivaLive.id).length}
          confirmadosCero={getConfirmadosCero(tiendaActivaLive.id)}
          onBack={volverAHome}
          onNavScanner={navScanner}
          onNavRegistros={navRegistros}
          onNavMisRegistros={esAdminEnTienda ? navMisRegistros : undefined}
          onNavImportar={navImportar}
          onNavResultados={navResultados}
          onNavSobrantes={navSobrantes}
          onNavEquipo={esAdminEnTienda ? () => setPantalla('equipo') : undefined}
          onNavReporte={esAdminEnTienda ? () => setPantalla('reporte') : undefined}
          onReiniciar={esAdminEnTienda ? () => reiniciarInventario(tiendaActivaLive.id) : undefined}
          onLimpiar={esSuperAdmin ? () => limpiarRegistrosTienda(tiendaActivaLive.id) : undefined}
          onToggleModo={esAdminEnTienda ? (modo) => toggleModoInventario(tiendaActivaLive.id, modo, usuario.nombre) : undefined}
        />
      </>
    );
  }

  // Guardia OFFLINE global para pantallas que requieren tiendaActiva
  // Si la tienda está en modo OFFLINE y el usuario no es admin → volver a tienda (muestra pantalla bloqueada)
  if (
    tiendaActivaLive?.modoInventario === 'OFFLINE' &&
    !esAdminEnTienda &&
    (pantalla === 'scanner' || pantalla === 'registros' || pantalla === 'sobrantes')
  ) {
    // redirigir a la vista de tienda que mostrará el bloqueo
    return null; // el useEffect de kick-out ya habrá redirigido; fallback silencioso
  }

  // ── Escáner ─────────────────────────────────────────────────────────────────
  if (pantalla === 'scanner' && tiendaActiva) {
    return (
      <>
        <StatusBar style="light" />
        <ScannerScreen
          usuario={usuario}
          tienda={tiendaActiva}
          registros={getRegistrosTienda(tiendaActiva.id)}
          catalogo={getCatalogo(tiendaActiva.id)}
          onGuardar={agregarRegistro}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Registros (vista admin = todos, vista contador = solo propios) ─────────
  if (pantalla === 'registros' && tiendaActiva) {
    return (
      <>
        <StatusBar style="dark" />
        <MisRegistrosScreen
          usuario={usuario}
          tienda={tiendaActiva}
          registros={registros}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          esAdmin={esAdminEnTienda}
          forzarSoloMios={false}
          onVolver={volverATienda}
          onEliminar={esAdminEnTienda ? eliminarRegistro : undefined}
          onEliminarSobrante={esAdminEnTienda ? eliminarSobrante : undefined}
          onEditarRegistro={editarRegistro}
        />
      </>
    );
  }

  // ── Mis Registros (solo los propios del admin/superadmin con edición) ───────
  if (pantalla === 'mis_registros' && tiendaActiva && esAdminEnTienda) {
    return (
      <>
        <StatusBar style="dark" />
        <MisRegistrosScreen
          usuario={usuario}
          tienda={tiendaActiva}
          registros={registros}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          esAdmin={esAdminEnTienda}
          forzarSoloMios={true}
          onVolver={volverATienda}
          onEliminar={eliminarRegistro}
          onEliminarSobrante={eliminarSobrante}
          onEditarRegistro={editarRegistro}
        />
      </>
    );
  }

  // ── Resultados (Admin/SuperAdmin en esa tienda) ─────────────────────────────
  if (pantalla === 'resultados' && tiendaActiva && esAdminEnTienda) {
    return (
      <>
        <StatusBar style="dark" />
        <ResultadosScreen
          registros={registros}
          tienda={tiendaActiva}
          catalogo={getCatalogo(tiendaActiva.id)}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          usuarios={usuarios}
          esAdmin={esAdminEnTienda}
          confirmadosCero={getConfirmadosCero(tiendaActiva.id)}
          onBack={volverATienda}
          onEliminarRegistro={esAdminEnTienda ? eliminarRegistro : undefined}
          onEditarRegistro={esAdminEnTienda ? editarRegistro : undefined}
          onConfirmarCero={esAdminEnTienda ? (itemId) => confirmarCero(tiendaActiva.id, itemId) : undefined}
          onDesconfirmarCero={esAdminEnTienda ? (itemId) => desconfirmarCero(tiendaActiva.id, itemId) : undefined}
        />
      </>
    );
  }

  // ── Sobrantes sin stock ─────────────────────────────────────────────────────
  // Visible para TODOS (contador también puede registrar sobrantes)
  if (pantalla === 'sobrantes' && tiendaActiva) {
    return (
      <>
        <StatusBar style="light" />
        <SobrantesSinStockScreen
          tienda={tiendaActiva}
          usuario={usuario}
          catalogo={getCatalogo(tiendaActiva.id)}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          onGuardar={agregarSobrante}
          onEliminar={esSuperAdmin ? eliminarSobrante : undefined}
          onEditarEstado={esAdminEnTienda ? (id, estado) => editarSobrante(id, { estado }) : undefined}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Reporte de Auditoría (Admin/SuperAdmin en esa tienda) ──────────────────
  if (pantalla === 'reporte' && tiendaActiva && esAdminEnTienda) {
    return (
      <>
        <StatusBar style="dark" />
        <ReporteAuditoriaScreen
          tienda={tiendaActiva}
          registros={registros}
          catalogo={getCatalogo(tiendaActiva.id)}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          usuarios={usuarios}
          confirmadosCero={getConfirmadosCero(tiendaActiva.id)}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Importar Excel (solo SUPERADMIN) ────────────────────────────────────────
  if (pantalla === 'importar' && tiendaActiva && esSuperAdmin) {
    return (
      <>
        <StatusBar style="dark" />
        <ImportarScreen
          tienda={tiendaActiva}
          catalogoActual={catalogos[tiendaActiva.id] ?? []}
          onImportar={data => {
            cargarCatalogo(tiendaActiva.id, data);
            volverATienda();
          }}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Home según rol ──────────────────────────────────────────────────────────
  if (usuario.rol === 'SUPERADMIN') {
    return (
      <>
        <StatusBar style="light" />
        <HomeSuperAdminScreen
          usuario={usuario}
          usuarios={usuarios}
          tiendas={tiendas}
          registros={registros}
          onLogout={logout}
          onNavTienda={navTienda}
          onNavEquipo={() => setPantalla('equipo')}
          onNavTiendas={() => setPantalla('tiendas')}
          onNavPerfil={navPerfil}
        />
      </>
    );
  }

  if (usuario.rol === 'ADMIN') {
    return (
      <>
        <StatusBar style="light" />
        <HomeAdminScreen
          usuario={usuario}
          usuarios={usuarios}
          tiendas={tiendas}
          registros={registros}
          onLogout={logout}
          onNavTienda={navTienda}
          onNavPerfil={navPerfil}
        />
      </>
    );
  }

  // CONTADOR
  return (
    <>
      <StatusBar style="light" />
      <HomeContadorScreen
        usuario={usuario}
        tiendas={tiendas}
        registros={registros}
        onLogout={logout}
        onNavTienda={navTienda}
        onNavPerfil={navPerfil}
      />
    </>
  );
}

// ─── PANTALLA: INVENTARIO CERRADO (no-admins bloqueados) ─────────────────────
import { Tienda } from './src/constants/data';
import { Ionicons } from '@expo/vector-icons';

const InventarioCerradoScreen: React.FC<{ tienda: Tienda; onVolver: () => void }> = ({
  tienda, onVolver,
}) => (
  <>
    <StatusBar style="light" />
    <View style={sc.bloqFondo}>
      <View style={sc.bloqIconBox}>
        <Ionicons name="lock-closed" size={36} color="#DC2626" />
      </View>
      <Text style={sc.bloqTitulo}>Inventario cerrado</Text>
      <Text style={sc.bloqTienda}>{tienda.nombre}</Text>
      <Text style={sc.bloqMensaje}>
        El acceso fue cerrado por{'\n'}
        <Text style={sc.bloqAdmin}>
          {tienda.cerradoPor ?? 'el administrador'}
        </Text>
        {'\n\n'}Contacta al administrador para reactivar el inventario.
      </Text>
      <TouchableOpacity style={sc.bloqBtn} onPress={onVolver} activeOpacity={0.85}>
        <Text style={sc.bloqBtnTxt}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  </>
);

const sc = StyleSheet.create({
  bloqFondo:   { flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center', padding: 36 },
  bloqIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1C1C1E', borderWidth: 1.5, borderColor: '#DC2626', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  bloqTitulo:  { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  bloqTienda:  { fontSize: 16, fontWeight: '700', color: '#DC2626', textAlign: 'center', marginBottom: 16 },
  bloqMensaje: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  bloqAdmin:   { color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  bloqBtn:     { backgroundColor: '#1C1C1E', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1, borderColor: '#3F3F46' },
  bloqBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
