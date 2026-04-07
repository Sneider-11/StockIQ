import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
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
import {
  ScreenTransition,
  BottomNavBar,
  PageLoader,
} from './src/components/common';

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

// ── Altura de la barra inferior ──────────────────────────────────────────────
const NAV_H = Platform.OS === 'ios' ? 82 : 64;

// ── Pestañas para Admin / SuperAdmin (dentro de tienda) ──────────────────────
const ADMIN_TABS = [
  { key: 'tienda',        label: 'Inicio',     icon: 'home-outline',          iconActive: 'home' },
  { key: 'scanner',       label: 'Escanear',   icon: 'scan-outline',          iconActive: 'scan' },
  { key: 'resultados',    label: 'Resultados', icon: 'bar-chart-outline',     iconActive: 'bar-chart' },
  { key: 'mis_registros', label: 'Mis Reg.',   icon: 'document-text-outline', iconActive: 'document-text' },
  { key: 'equipo',        label: 'Equipo',     icon: 'people-outline',        iconActive: 'people' },
];

// ── Pestañas para Contador (dentro de tienda) ────────────────────────────────
const CONTADOR_TABS = [
  { key: 'tienda',    label: 'Inicio',    icon: 'home-outline', iconActive: 'home' },
  { key: 'scanner',   label: 'Escanear',  icon: 'scan-outline', iconActive: 'scan' },
  { key: 'registros', label: 'Registros', icon: 'list-outline', iconActive: 'list' },
];

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

  // ── Derivados ────────────────────────────────────────────────────────────────
  const esSuperAdmin    = usuario?.rol === 'SUPERADMIN';
  const esAdmin         = usuario?.rol === 'ADMIN' || esSuperAdmin;
  const rolEnTienda     = tiendaActiva && usuario ? getRolEnTienda(usuario, tiendaActiva.id) : (usuario?.rol ?? 'CONTADOR');
  const esAdminEnTienda = rolEnTienda === 'ADMIN' || rolEnTienda === 'SUPERADMIN';

  const tiendaActivaLive = tiendaActiva
    ? (tiendas.find(t => t.id === tiendaActiva.id) ?? tiendaActiva)
    : null;

  // ── Bottom nav — calculado antes de cualquier return condicional ─────────────
  const tabs          = esAdminEnTienda ? ADMIN_TABS : CONTADOR_TABS;
  const bottomNavKeys = tabs.map(t => t.key);
  const showBottomNav = !!(tiendaActivaLive && bottomNavKeys.includes(pantalla));

  const handleBottomNav = (key: string) => {
    // tiendaActivaLive is guaranteed to be set when bottom nav is visible
    if (!tiendaActivaLive) return;
    switch (key) {
      case 'tienda':        volverATienda();                        break;
      case 'scanner':       navScanner(tiendaActivaLive);          break;
      case 'registros':     navRegistros(tiendaActivaLive);        break;
      case 'mis_registros': navMisRegistros(tiendaActivaLive);     break;
      case 'resultados':    navResultados(tiendaActivaLive);       break;
      case 'equipo':        setPantalla('equipo');                  break;
    }
  };

  // ── Helper: wrapper para pantallas en contexto tienda ──────────────────────
  // Anima la entrada de cada pantalla y muestra la barra de nav inferior.
  const withNav = (statusStyle: 'light' | 'dark', content: React.ReactNode) => (
    <View style={{ flex: 1 }}>
      <StatusBar style={statusStyle} />
      <View style={{ flex: 1, paddingBottom: showBottomNav ? NAV_H : 0 }}>
        <ScreenTransition screenKey={pantalla}>
          {content}
        </ScreenTransition>
      </View>
      {showBottomNav && (
        <BottomNavBar
          tabs={tabs}
          activeKey={pantalla}
          onSelect={handleBottomNav}
        />
      )}
    </View>
  );

  // ── Kick-out reactivo: tienda pasa a OFFLINE mientras el usuario está dentro ─
  // DEBE ir antes de cualquier return condicional
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
  if (cargando) return <PageLoader />;

  // ── Sin sesión ───────────────────────────────────────────────────────────────
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

  // ── Perfil ───────────────────────────────────────────────────────────────────
  if (pantalla === 'perfil') {
    return (
      <>
        <StatusBar style="light" />
        <ScreenTransition screenKey="perfil">
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
        </ScreenTransition>
      </>
    );
  }

  // ── Gestión de tiendas (solo SUPERADMIN) ─────────────────────────────────────
  if (pantalla === 'tiendas' && esSuperAdmin) {
    return (
      <>
        <StatusBar style="dark" />
        <ScreenTransition screenKey="tiendas">
          <GestionTiendasScreen
            tiendas={tiendas}
            onAgregar={agregarTienda}
            onEditar={editarTienda}
            onEliminar={eliminarTienda}
            onVolver={() => setPantalla('home')}
          />
        </ScreenTransition>
      </>
    );
  }

  // ── Gestión de equipo — desde tienda (Admin) usa withNav; desde home no ──────
  if (pantalla === 'equipo' && esAdminEnTienda) {
    const equipoScreen = (
      <GestionEquipoScreen
        usuarioActual={usuario}
        usuarios={usuarios}
        tiendas={tiendas}
        tiendaFiltro={tiendaActiva ?? undefined}
        onAgregar={agregarUsuario}
        onEditar={editarUsuario}
        onEliminar={eliminarUsuario}
        onVolver={() => setPantalla(tiendaActiva ? 'tienda' : 'home')}
      />
    );

    if (tiendaActiva) {
      return withNav('dark', equipoScreen);
    }
    return (
      <>
        <StatusBar style="dark" />
        <ScreenTransition screenKey="equipo">
          {equipoScreen}
        </ScreenTransition>
      </>
    );
  }

  // ── Reporte de Auditoría ──────────────────────────────────────────────────────
  if (pantalla === 'reporte' && tiendaActiva && esAdminEnTienda) {
    return (
      <>
        <StatusBar style="dark" />
        <ScreenTransition screenKey="reporte">
          <ReporteAuditoriaScreen
            tienda={tiendaActiva}
            registros={registros}
            catalogo={getCatalogo(tiendaActiva.id)}
            sobrantes={getSobrantesTienda(tiendaActiva.id)}
            usuarios={usuarios}
            confirmadosCero={getConfirmadosCero(tiendaActiva.id)}
            onBack={volverATienda}
          />
        </ScreenTransition>
      </>
    );
  }

  // ── Importar Excel (ADMIN y SUPERADMIN) ──────────────────────────────────────
  if (pantalla === 'importar' && tiendaActiva && esAdmin) {
    return (
      <>
        <StatusBar style="dark" />
        <ScreenTransition screenKey="importar">
          <ImportarScreen
            tienda={tiendaActiva}
            catalogoActual={catalogos[tiendaActiva.id] ?? []}
            onImportar={data => {
              cargarCatalogo(tiendaActiva.id, data);
              volverATienda();
            }}
            onBack={volverATienda}
          />
        </ScreenTransition>
      </>
    );
  }

  // ── Interior de tienda ────────────────────────────────────────────────────────
  if (pantalla === 'tienda' && tiendaActivaLive) {
    if (tiendaActivaLive.modoInventario === 'OFFLINE' && !esAdminEnTienda) {
      return <InventarioCerradoScreen tienda={tiendaActivaLive} onVolver={volverAHome} />;
    }
    return withNav('light', (
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
    ));
  }

  // Guardia OFFLINE global
  if (
    tiendaActivaLive?.modoInventario === 'OFFLINE' &&
    !esAdminEnTienda &&
    (pantalla === 'scanner' || pantalla === 'registros' || pantalla === 'sobrantes')
  ) {
    return null;
  }

  // ── Escáner ───────────────────────────────────────────────────────────────────
  if (pantalla === 'scanner' && tiendaActiva) {
    return withNav('light', (
      <ScannerScreen
        usuario={usuario}
        tienda={tiendaActiva}
        registros={getRegistrosTienda(tiendaActiva.id)}
        catalogo={getCatalogo(tiendaActiva.id)}
        onGuardar={agregarRegistro}
        onBack={volverATienda}
      />
    ));
  }

  // ── Registros (vista admin = todos) ──────────────────────────────────────────
  if (pantalla === 'registros' && tiendaActiva) {
    return withNav('dark', (
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
    ));
  }

  // ── Mis Registros (solo propios del admin) ────────────────────────────────────
  if (pantalla === 'mis_registros' && tiendaActiva && esAdminEnTienda) {
    return withNav('dark', (
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
    ));
  }

  // ── Resultados ────────────────────────────────────────────────────────────────
  if (pantalla === 'resultados' && tiendaActiva && esAdminEnTienda) {
    return withNav('dark', (
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
    ));
  }

  // ── Sobrantes sin stock ───────────────────────────────────────────────────────
  if (pantalla === 'sobrantes' && tiendaActiva) {
    return withNav('light', (
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
    ));
  }

  // ── Home según rol ─────────────────────────────────────────────────────────
  if (usuario.rol === 'SUPERADMIN') {
    return (
      <>
        <StatusBar style="light" />
        <ScreenTransition screenKey="home-superadmin">
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
        </ScreenTransition>
      </>
    );
  }

  if (usuario.rol === 'ADMIN') {
    return (
      <>
        <StatusBar style="light" />
        <ScreenTransition screenKey="home-admin">
          <HomeAdminScreen
            usuario={usuario}
            usuarios={usuarios}
            tiendas={tiendas}
            registros={registros}
            onLogout={logout}
            onNavTienda={navTienda}
            onNavPerfil={navPerfil}
          />
        </ScreenTransition>
      </>
    );
  }

  // CONTADOR
  return (
    <>
      <StatusBar style="light" />
      <ScreenTransition screenKey="home-contador">
        <HomeContadorScreen
          usuario={usuario}
          tiendas={tiendas}
          registros={registros}
          onLogout={logout}
          onNavTienda={navTienda}
          onNavPerfil={navPerfil}
        />
      </ScreenTransition>
    </>
  );
}

// ─── PANTALLA: INVENTARIO CERRADO ────────────────────────────────────────────
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
