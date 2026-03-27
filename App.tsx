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
} from './src/screens';

export default function App() {
  const state = useAppState();
  const {
    cargando,
    usuario, usuarios, pantalla, tiendaActiva, registros, catalogos,
    login, logout,
    navTienda, navScanner, navRegistros, navResultados, navImportar,
    volverATienda, volverAHome,
    setPantalla,
    agregarUsuario, editarUsuario, eliminarUsuario,
    agregarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
  } = state;

  // ── Pantalla de carga mientras se leen datos locales ────────────────────────
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
          onBack={volverAHome}
          onNavScanner={navScanner}
          onNavRegistros={navRegistros}
          onNavImportar={navImportar}
          onNavResultados={navResultados}
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
      />
    </>
  );
}
