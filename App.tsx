import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppState } from './src/hooks/useAppState';
import {
  LoginScreen,
  HomeSuperAdminScreen,
  HomeAuditorScreen,
  GestionEquipoScreen,
  TiendaScreen,
  ScannerScreen,
  MisRegistrosScreen,
  ResultadosScreen,
  ImportarScreen,
  SobrantesSinStockScreen,
  PerfilScreen,
} from './src/screens';

export default function App() {
  const state = useAppState();
  const {
    cargando,
    usuario, usuarios, pantalla, tiendaActiva, registros, catalogos,
    login, logout,
    navTienda, navScanner, navRegistros, navResultados, navImportar, navSobrantes, navPerfil,
    volverATienda, volverAHome,
    setPantalla,
    agregarUsuario, editarUsuario, eliminarUsuario,
    agregarRegistro, eliminarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
    limpiarRegistrosTienda,
    agregarSobrante, eliminarSobrante, editarSobrante, getSobrantesTienda,
  } = state;

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

  // ── Perfil / Cambiar contraseña ─────────────────────────────────────────────
  if (pantalla === 'perfil') {
    return (
      <>
        <StatusBar style="light" />
        <PerfilScreen
          usuario={usuario}
          registros={registros}
          onCambiarPass={nueva => editarUsuario(usuario.id, { pass: nueva })}
          onLogout={logout}
          onBack={() => setPantalla('home')}
        />
      </>
    );
  }

  // ── Gestión de equipo ───────────────────────────────────────────────────────
  if (pantalla === 'equipo') {
    return (
      <>
        <StatusBar style="dark" />
        <GestionEquipoScreen
          usuarios={usuarios}
          onAgregar={agregarUsuario}
          onEditar={editarUsuario}
          onEliminar={eliminarUsuario}
          onVolver={() => setPantalla('home')}
        />
      </>
    );
  }

  // ── Interior de tienda ──────────────────────────────────────────────────────
  if (pantalla === 'tienda' && tiendaActiva) {
    return (
      <>
        <StatusBar style="light" />
        <TiendaScreen
          tienda={tiendaActiva}
          usuario={usuario}
          usuarios={usuarios}
          registros={registros}
          catalogos={catalogos}
          sobrantesTienda={getSobrantesTienda(tiendaActiva.id).length}
          onBack={volverAHome}
          onNavScanner={navScanner}
          onNavRegistros={navRegistros}
          onNavImportar={navImportar}
          onNavResultados={navResultados}
          onNavSobrantes={navSobrantes}
          onLimpiar={() => limpiarRegistrosTienda(tiendaActiva.id)}
        />
      </>
    );
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

  // ── Registros ───────────────────────────────────────────────────────────────
  if (pantalla === 'registros' && tiendaActiva) {
    return (
      <>
        <StatusBar style="dark" />
        <MisRegistrosScreen
          usuario={usuario}
          tienda={tiendaActiva}
          registros={registros}
          esAdmin={usuario.rol === 'SUPERADMIN'}
          onVolver={volverATienda}
          onEliminar={usuario.rol === 'SUPERADMIN' ? eliminarRegistro : undefined}
        />
      </>
    );
  }

  // ── Resultados ──────────────────────────────────────────────────────────────
  if (pantalla === 'resultados' && tiendaActiva) {
    return (
      <>
        <StatusBar style="dark" />
        <ResultadosScreen
          registros={registros}
          tienda={tiendaActiva}
          catalogo={getCatalogo(tiendaActiva.id)}
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Sobrantes sin stock ──────────────────────────────────────────────────────
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
          onEliminar={usuario.rol === 'SUPERADMIN' ? eliminarSobrante : undefined}
          onEditarEstado={(id, estado) => editarSobrante(id, { estado })}
          onBack={volverATienda}
        />
      </>
    );
  }

  // ── Importar Excel ──────────────────────────────────────────────────────────
  if (pantalla === 'importar' && tiendaActiva) {
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
          registros={registros}
          onLogout={logout}
          onNavTienda={navTienda}
          onNavEquipo={() => setPantalla('equipo')}
          onNavPerfil={navPerfil}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <HomeAuditorScreen
        usuario={usuario}
        registros={registros}
        onLogout={logout}
        onNavTienda={navTienda}
        onNavPerfil={navPerfil}
      />
    </>
  );
}
