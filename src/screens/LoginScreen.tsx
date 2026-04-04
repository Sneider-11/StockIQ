import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario } from '../constants/data';
import { Avatar } from '../components/common';
import { PRP, BLK, DRK, MTD, LGR, BRD } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

const MAX_INTENTOS = 5;
const BLOQUEO_SEG  = 30;

interface Props {
  usuarios:      Usuario[];
  onLogin:       (u: Usuario) => void;
  mensajeExtra?: string;
}

export const LoginScreen: React.FC<Props> = ({ usuarios, onLogin, mensajeExtra }) => {
  const { isDark, toggleTheme } = useTheme();

  const [cedula, setCedula]             = useState('');
  const [pass, setPass]                 = useState('');
  const [show, setShow]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [intentos, setIntentos]         = useState(0);
  const [bloqueadoHasta, setBloqueado]  = useState<number | null>(null);
  const [segsRestantes, setSegsRest]    = useState(0);
  const [cedulaFocus, setCedulaFocus]   = useState(false);
  const [passFocus, setPassFocus]       = useState(false);

  // ── Animaciones ────────────────────────────────────────────────────────────
  const shake        = useRef(new Animated.Value(0)).current;
  const cardY        = useRef(new Animated.Value(48)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.72)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const toggleScale  = useRef(new Animated.Value(1)).current;

  // Animación de entrada al montar
  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, tension: 75, friction: 9, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardY,       { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Contador regresivo del bloqueo
  useEffect(() => {
    if (!bloqueadoHasta) return;
    const tick = setInterval(() => {
      const restantes = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
      if (restantes <= 0) { setBloqueado(null); setSegsRest(0); setError(''); clearInterval(tick); }
      else setSegsRest(restantes);
    }, 500);
    return () => clearInterval(tick);
  }, [bloqueadoHasta]);

  const doShake = () => Animated.sequence([
    Animated.timing(shake, { toValue: 10, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 5,  duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue: 0,  duration: 55, useNativeDriver: true }),
  ]).start();

  const pressIn  = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 0.94, useNativeDriver: true, tension: 220, friction: 10 }).start();
  const pressOut = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1,    useNativeDriver: true, tension: 220, friction: 10 }).start();

  const login = () => {
    setError('');
    if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
      setError(`Demasiados intentos. Espera ${segsRestantes}s.`); doShake(); return;
    }
    if (!cedula.trim()) { setError('Ingresa tu número de cédula.'); doShake(); return; }
    if (!pass)          { setError('Ingresa tu contraseña.');        doShake(); return; }

    const u = usuarios.find(u => u.cedula === cedula.trim());
    if (!u) { setError('Cédula no registrada. Contacta al administrador.'); doShake(); return; }
    if (u.activo === false) { setError('Tu cuenta está inactiva. Contacta al administrador.'); doShake(); return; }

    if (u.pass !== pass) {
      const nuevo = intentos + 1;
      setIntentos(nuevo);
      if (nuevo >= MAX_INTENTOS) {
        const hasta = Date.now() + BLOQUEO_SEG * 1000;
        setBloqueado(hasta); setSegsRest(BLOQUEO_SEG); setIntentos(0);
        setError(`Bloqueado por ${BLOQUEO_SEG}s. Demasiados intentos fallidos.`);
      } else {
        setError(`Contraseña incorrecta. ${MAX_INTENTOS - nuevo} intento${MAX_INTENTOS - nuevo !== 1 ? 's' : ''} restante${MAX_INTENTOS - nuevo !== 1 ? 's' : ''}.`);
      }
      doShake(); return;
    }

    setIntentos(0); setBloqueado(null);
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(u); }, 800);
  };

  const loginRapido = (u: Usuario) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(u); }, 500);
  };

  // ── Tokens de color por tema ────────────────────────────────────────────────
  const t = {
    bg:            isDark ? '#09090B'                        : '#F0EFFE',
    glow1:         isDark ? 'rgba(124,58,237,0.20)'          : 'rgba(124,58,237,0.11)',
    glow2:         isDark ? 'rgba(91,33,182,0.14)'           : 'rgba(91,33,182,0.07)',
    cardBg:        isDark ? 'rgba(255,255,255,0.07)'         : 'rgba(255,255,255,0.82)',
    cardBorder:    isDark ? 'rgba(255,255,255,0.16)'         : 'rgba(124,58,237,0.15)',
    highlightLine: isDark ? 'rgba(255,255,255,0.18)'         : 'rgba(255,255,255,0.9)',
    title:         isDark ? '#FFFFFF'                        : BLK,
    sub:           isDark ? 'rgba(255,255,255,0.48)'         : MTD,
    fieldBg:       isDark ? 'rgba(255,255,255,0.06)'         : '#F4F4F5',
    fieldBorder:   isDark ? 'rgba(255,255,255,0.10)'         : BRD,
    inputColor:    isDark ? '#FFFFFF'                        : BLK,
    iconColor:     isDark ? 'rgba(255,255,255,0.45)'         : MTD,
    iconBorder:    isDark ? 'rgba(255,255,255,0.08)'         : BRD,
    placeholder:   isDark ? 'rgba(255,255,255,0.28)'         : '#767676',
    brandColor:    isDark ? '#FFFFFF'                        : BLK,
    brandSub:      isDark ? 'rgba(255,255,255,0.40)'         : 'rgba(0,0,0,0.36)',
    toggleBg:      isDark ? 'rgba(255,255,255,0.12)'         : 'rgba(0,0,0,0.07)',
    toggleIcon:    isDark ? '#FCD34D'                        : '#4B5563',
    demoBg:        isDark ? 'rgba(255,255,255,0.05)'         : 'rgba(0,0,0,0.03)',
    demoBorder:    isDark ? 'rgba(255,255,255,0.08)'         : 'rgba(0,0,0,0.07)',
    demoLine:      isDark ? 'rgba(255,255,255,0.07)'         : 'rgba(0,0,0,0.07)',
    demoLbl:       isDark ? 'rgba(255,255,255,0.30)'         : 'rgba(0,0,0,0.28)',
    demoName:      isDark ? '#FFFFFF'                        : BLK,
    demoCed:       isDark ? 'rgba(255,255,255,0.40)'         : MTD,
    verColor:      isDark ? 'rgba(255,255,255,0.18)'         : 'rgba(0,0,0,0.22)',
    errBg:         isDark ? '#2D0A0A'                        : '#FEF2F2',
    errBorder:     isDark ? '#F87171'                        : '#DC2626',
    errTxt:        isDark ? '#F87171'                        : '#DC2626',
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Fondo */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.bg }]} />
      <View style={[s.glow1, { backgroundColor: t.glow1 }]} />
      <View style={[s.glow2, { backgroundColor: t.glow2 }]} />

      {/* Toggle modo oscuro — esquina superior derecha */}
      <Animated.View style={[s.themeToggleWrap, { transform: [{ scale: toggleScale }] }]}>
        <TouchableOpacity
          style={[s.themeToggle, { backgroundColor: t.toggleBg }]}
          onPress={toggleTheme}
          onPressIn={() => pressIn(toggleScale)}
          onPressOut={() => pressOut(toggleScale)}
          activeOpacity={1}
          accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          accessibilityRole="button"
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={t.toggleIcon} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo — con animación de entrada */}
        <Animated.View style={[s.logoSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={[s.logoCard, { shadowColor: PRP }]}>
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={[s.brand, { color: t.brandColor }]}>StockIQ</Text>
          <Text style={[s.brandSub, { color: t.brandSub }]}>Sistema de Auditoría de Inventarios</Text>
        </Animated.View>

        {/* Tarjeta de login — glassmorphism */}
        <Animated.View style={[
          s.card,
          {
            backgroundColor: t.cardBg,
            borderColor: t.cardBorder,
            opacity: cardOpacity,
            transform: [{ translateX: shake }, { translateY: cardY }],
          }
        ]}>
          {/* Línea de highlight glass en el borde superior */}
          <View style={[s.glassHighlight, { backgroundColor: t.highlightLine }]} />

          <Text style={[s.cardTitle, { color: t.title }]}>Iniciar sesión</Text>
          <Text style={[s.cardSub,   { color: t.sub   }]}>Ingresa con tu cédula y contraseña</Text>

          {mensajeExtra ? (
            <View style={[s.errBox, { backgroundColor: t.errBg, borderLeftColor: t.errBorder }]}>
              <Ionicons name="alert-circle" size={15} color={t.errTxt} />
              <Text style={[s.errTxt, { color: t.errTxt }]}>{mensajeExtra}</Text>
            </View>
          ) : null}

          {/* Campo cédula */}
          <View style={s.fieldWrap}>
            <View style={[
              s.inputRow,
              { backgroundColor: t.fieldBg, borderColor: cedulaFocus ? PRP : t.fieldBorder },
              cedulaFocus && s.inputFocused,
            ]}>
              <View style={[s.inputIcon, { borderRightColor: t.iconBorder }]}>
                <Ionicons name="person-outline" size={17} color={cedulaFocus ? PRP : t.iconColor} />
              </View>
              <TextInput
                style={[s.input, { color: t.inputColor }]}
                placeholder="Número de cédula"
                placeholderTextColor={t.placeholder}
                value={cedula}
                onChangeText={txt => { setCedula(txt); setError(''); }}
                onFocus={() => setCedulaFocus(true)}
                onBlur={() => setCedulaFocus(false)}
                keyboardType="numeric"
                returnKeyType="next"
                accessibilityLabel="Número de cédula"
              />
            </View>
          </View>

          {/* Campo contraseña */}
          <View style={s.fieldWrap}>
            <View style={[
              s.inputRow,
              { backgroundColor: t.fieldBg, borderColor: passFocus ? PRP : t.fieldBorder },
              passFocus && s.inputFocused,
            ]}>
              <View style={[s.inputIcon, { borderRightColor: t.iconBorder }]}>
                <Ionicons name="lock-closed-outline" size={17} color={passFocus ? PRP : t.iconColor} />
              </View>
              <TextInput
                style={[s.input, { flex: 1, color: t.inputColor }]}
                placeholder="Contraseña"
                placeholderTextColor={t.placeholder}
                secureTextEntry={!show}
                value={pass}
                onChangeText={txt => { setPass(txt); setError(''); }}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
                returnKeyType="done"
                onSubmitEditing={login}
                accessibilityLabel="Contraseña"
              />
              <TouchableOpacity onPress={() => setShow(!show)} style={s.eyeBtn}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={t.iconColor} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={[s.errBox, { backgroundColor: t.errBg, borderLeftColor: t.errBorder }]} accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle" size={15} color={t.errTxt} />
              <Text style={[s.errTxt, { color: t.errTxt }]}>{error}</Text>
            </View>
          ) : null}

          {/* Botón ingresar — con animación de escala al presionar */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 4 }}>
            <TouchableOpacity
              style={[s.loginBtn, loading && { opacity: 0.75 }]}
              onPress={login}
              onPressIn={() => pressIn(btnScale)}
              onPressOut={() => pressOut(btnScale)}
              disabled={loading}
              activeOpacity={1}
              accessibilityLabel="Ingresar"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={s.loginBtnTxt}>Ingresar</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
              }
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Acceso rápido — solo __DEV__ */}
        {__DEV__ && (
          <View style={[s.demo, { backgroundColor: t.demoBg, borderColor: t.demoBorder }]}>
            <View style={s.demoHeader}>
              <View style={[s.demoLine, { backgroundColor: t.demoLine }]} />
              <Text style={[s.demoLbl, { color: t.demoLbl }]}>Acceso rápido · Solo Dev</Text>
              <View style={[s.demoLine, { backgroundColor: t.demoLine }]} />
            </View>
            {usuarios.map(u => (
              <TouchableOpacity
                key={u.id}
                style={[s.demoItem, { borderTopColor: t.demoLine }]}
                onPress={() => loginRapido(u)}
                activeOpacity={0.7}
              >
                <Avatar nombre={u.nombre} size={40} bg={u.rol === 'SUPERADMIN' ? PRP : DRK} fotoUri={u.fotoUri} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.demoName, { color: t.demoName }]}>{u.nombre}</Text>
                  <Text style={[s.demoCed, { color: t.demoCed }]}>CC {u.cedula}</Text>
                </View>
                <View style={[s.rolPill, {
                  backgroundColor: u.rol === 'SUPERADMIN'
                    ? 'rgba(124,58,237,0.18)'
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                }]}>
                  <Text style={[s.rolTxt, { color: u.rol === 'SUPERADMIN' ? '#A78BFA' : MTD }]}>
                    {u.rol === 'SUPERADMIN' ? 'Super Admin' : 'Auditor'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[s.ver, { color: t.verColor }]}>v2.3.0 · StockIQ · Grupo Comercial</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Fondos y glows
  glow1: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -140, right: -100 },
  glow2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: 60, left: -80 },

  // Toggle de modo oscuro
  themeToggleWrap: { position: 'absolute', top: 56, right: 20, zIndex: 20 },
  themeToggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 68, paddingBottom: 40 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoCard:    { width: 76, height: 76, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
  logoLetter:  { fontSize: 40, fontWeight: '900', color: PRP },
  brand:       { fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 6 },
  brandSub:    { fontSize: 12, textAlign: 'center' },

  // Tarjeta glassmorphism
  card:           { borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.14, shadowRadius: 28, elevation: 14, overflow: 'hidden' },
  glassHighlight: { position: 'absolute', top: 0, left: 28, right: 28, height: 1, borderBottomLeftRadius: 1, borderBottomRightRadius: 1 },
  cardTitle:      { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub:        { fontSize: 13, marginBottom: 24 },

  // Campos
  fieldWrap:    { marginBottom: 12 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1.5, overflow: 'hidden' },
  inputFocused: { shadowColor: PRP, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  inputIcon:    { width: 46, alignItems: 'center', justifyContent: 'center', height: 50, borderRightWidth: 1 },
  input:        { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 15 },
  eyeBtn:       { paddingHorizontal: 14, height: 50, alignItems: 'center', justifyContent: 'center' },

  errBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  errTxt:  { fontSize: 13, color: '#DC2626', fontWeight: '600', flex: 1 },

  loginBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRP, borderRadius: 14, height: 52 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Acceso rápido dev
  demo:       { borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  demoLine:   { flex: 1, height: 1 },
  demoLbl:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  demoItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  demoName:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  demoCed:    { fontSize: 11 },
  rolPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolTxt:     { fontSize: 11, fontWeight: '600' },

  ver: { textAlign: 'center', fontSize: 11, marginTop: 4 },
});
