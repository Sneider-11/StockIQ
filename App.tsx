import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppState } from './src/hooks/useAppState';
import { getRolEnTienda } from './src/utils/helpers';
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
  const state = useAppState();
  const {
    cargando,
    tiendas,
    usuario, usuarios, pantalla, tiendaActiva, registros, catalogos,
    login, logout,
    navTienda, navScanner, navRegistros, navResultados, navImportar, navSobrantes, navPerfil,
    volverATienda, volverAHome,
    setPantalla,
    agregarTienda, editarTienda, eliminarTienda,
    agregarUsuario, editarUsuario, eliminarUsuario,
    agregarRegistro, eliminarRegistro, editarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
    limpiarRegistrosTienda,
    agregarSobrante, eliminarSobrante, editarSobrante, getSobrantesTienda,
    confirmarCero, desconfirmarCero, getConfirmadosCero,
    reiniciarInventario,
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

  const esSuperAdmin    = usuario.rol === 'SUPERADMIN';
  const esAdmin         = usuario.rol === 'ADMIN' || esSuperAdmin;
  const rolEnTienda     = tiendaActiva ? getRolEnTienda(usuario, tiendaActiva.id) : usuario.rol;
  const esAdminEnTienda = rolEnTienda === 'ADMIN' || rolEnTienda === 'SUPERADMIN';

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
  if (pantalla === 'tienda' && tiendaActiva) {
    return (
      <>
        <StatusBar style="light" />
        <TiendaScreen
          tienda={tiendaActiva}
          usuario={{ ...usuario, rol: rolEnTienda }}
          usuarios={usuarios}
          registros={registros}
          catalogos={catalogos}
          sobrantesTienda={getSobrantesTienda(tiendaActiva.id).length}
          confirmadosCero={getConfirmadosCero(tiendaActiva.id)}
          onBack={volverAHome}
          onNavScanner={navScanner}
          onNavRegistros={navRegistros}
          onNavImportar={navImportar}
          onNavResultados={navResultados}
          onNavSobrantes={navSobrantes}
          onNavEquipo={esAdminEnTienda ? () => setPantalla('equipo') : undefined}
          onNavReporte={esAdminEnTienda ? () => setPantalla('reporte') : undefined}
          onReiniciar={esAdminEnTienda ? () => reiniciarInventario(tiendaActiva.id) : undefined}
          onLimpiar={esSuperAdmin ? () => limpiarRegistrosTienda(tiendaActiva.id) : undefined}
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
          sobrantes={getSobrantesTienda(tiendaActiva.id)}
          esAdmin={esAdminEnTienda}
          onVolver={volverATienda}
          onEliminar={esAdminEnTienda ? eliminarRegistro : undefined}
          onEliminarSobrante={esAdminEnTienda ? eliminarSobrante : undefined}
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
