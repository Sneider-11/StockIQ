import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Usuario } from '../constants/data';
import { Avatar } from '../components/common';
import { PRP, IND, VLT, BLK, DRK, MTD, BRD } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

const MAX_INTENTOS = 5;
const BLOQUEO_SEG  = 30;

// Partículas flotantes decorativas — posiciones fijas para evitar
// variación en re-renders de desarrollo.
const PTCLS = [
  { left: '12%',  top: '18%', size: 3.5, dur: 3400, delay: 0    },
  { left: '80%',  top: '28%', size: 2.5, dur: 4200, delay: 700  },
  { left: '22%',  top: '60%', size: 4.0, dur: 3800, delay: 1400 },
  { left: '88%',  top: '72%', size: 3.0, dur: 3100, delay: 350  },
  { left: '50%',  top: '82%', size: 2.0, dur: 4600, delay: 1800 },
];

interface Props {
  usuarios:      Usuario[];
  onLogin:       (u: Usuario) => void;
  mensajeExtra?: string;
}

export const LoginScreen: React.FC<Props> = ({ usuarios, onLogin, mensajeExtra }) => {
  const { isDark, toggleTheme } = useTheme();

  const [cedula, setCedula]           = useState('');
  const [pass, setPass]               = useState('');
  const [show, setShow]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [intentos, setIntentos]       = useState(0);
  const [bloqueadoHasta, setBloqueado]= useState<number | null>(null);
  const [segsRestantes, setSegsRest]  = useState(0);
  const [cedulaFocus, setCedulaFocus] = useState(false);
  const [passFocus, setPassFocus]     = useState(false);

  // ── Animaciones ────────────────────────────────────────────────────────────
  const shake       = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(52)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.68)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRing    = useRef(new Animated.Value(0)).current;   // pulso del anillo
  const btnScale    = useRef(new Animated.Value(1)).current;
  const toggleScale = useRef(new Animated.Value(1)).current;

  // Partículas: translateY + opacity
  const ptclY  = useRef(PTCLS.map(() => new Animated.Value(0))).current;
  const ptclOp = useRef(PTCLS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Entrada principal
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1,   tension: 68, friction: 9, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1,   duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardY,       { toValue: 0,   tension: 62, friction: 12, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1,   duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulso del anillo del logo (loop)
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoRing, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(logoRing, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ]),
    );
    ringLoop.start();

    // Partículas flotantes
    const ptclAnims = PTCLS.map((p, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.timing(ptclOp[i], { toValue: 0.7, duration: 600,     useNativeDriver: true }),
            Animated.timing(ptclY[i],  { toValue: -14,  duration: p.dur,   useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ptclOp[i], { toValue: 0,   duration: 600,     useNativeDriver: true }),
            Animated.timing(ptclY[i],  { toValue: 0,    duration: 0,       useNativeDriver: true }),
          ]),
        ]),
      ),
    );
    ptclAnims.forEach(a => a.start());

    return () => {
      ringLoop.stop();
      ptclAnims.forEach(a => a.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    Animated.timing(shake, { toValue:  10, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue:  -8, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue:   5, duration: 55, useNativeDriver: true }),
    Animated.timing(shake, { toValue:   0, duration: 55, useNativeDriver: true }),
  ]).start();

  const pressIn  = (a: Animated.Value) =>
    Animated.spring(a, { toValue: 0.93, tension: 240, friction: 10, useNativeDriver: true }).start();
  const pressOut = (a: Animated.Value) =>
    Animated.spring(a, { toValue: 1,    tension: 240, friction: 10, useNativeDriver: true }).start();

  const login = () => {
    setError('');
    if (bloqueadoHasta && Date.now() < bloqueadoHasta) {
      setError(`Demasiados intentos. Espera ${segsRestantes}s.`); doShake(); return;
    }
    if (!cedula.trim()) { setError('Ingresa tu número de cédula.'); doShake(); return; }
    if (!pass)          { setError('Ingresa tu contraseña.');       doShake(); return; }

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

  // ── Tokens de color ────────────────────────────────────────────────────────
  const t = {
    cardBg:        isDark ? 'rgba(255,255,255,0.055)'        : 'rgba(255,255,255,0.90)',
    cardBorder:    isDark ? 'rgba(255,255,255,0.12)'          : 'rgba(124,58,237,0.18)',
    highlightLine: isDark ? 'rgba(255,255,255,0.20)'          : 'rgba(255,255,255,0.95)',
    title:         isDark ? '#F4F4F5'                         : BLK,
    sub:           isDark ? 'rgba(255,255,255,0.42)'          : MTD,
    fieldBg:       isDark ? 'rgba(255,255,255,0.055)'         : '#F4F4F5',
    fieldBorder:   isDark ? 'rgba(255,255,255,0.10)'          : BRD,
    inputColor:    isDark ? '#FFFFFF'                         : BLK,
    iconColor:     isDark ? 'rgba(255,255,255,0.40)'          : MTD,
    iconBorder:    isDark ? 'rgba(255,255,255,0.07)'          : BRD,
    placeholder:   isDark ? 'rgba(255,255,255,0.28)'          : '#767676',
    brandColor:    isDark ? '#FFFFFF'                         : BLK,
    brandSub:      isDark ? 'rgba(255,255,255,0.38)'          : 'rgba(0,0,0,0.35)',
    toggleBg:      isDark ? 'rgba(255,255,255,0.10)'          : 'rgba(0,0,0,0.06)',
    toggleIcon:    isDark ? '#FCD34D'                         : '#4B5563',
    demoBg:        isDark ? 'rgba(255,255,255,0.04)'          : 'rgba(0,0,0,0.03)',
    demoBorder:    isDark ? 'rgba(255,255,255,0.08)'          : 'rgba(0,0,0,0.06)',
    demoLine:      isDark ? 'rgba(255,255,255,0.06)'          : 'rgba(0,0,0,0.06)',
    demoLbl:       isDark ? 'rgba(255,255,255,0.28)'          : 'rgba(0,0,0,0.26)',
    demoName:      isDark ? '#FFFFFF'                         : BLK,
    demoCed:       isDark ? 'rgba(255,255,255,0.38)'          : MTD,
    verColor:      isDark ? 'rgba(255,255,255,0.15)'          : 'rgba(0,0,0,0.20)',
    errBg:         isDark ? '#1A0505'                         : '#FEF2F2',
    errBorder:     isDark ? '#F87171'                         : '#DC2626',
    errTxt:        isDark ? '#F87171'                         : '#DC2626',
  };

  // Colores del gradiente de fondo según tema
  const bgGradient: [string, string, string] = isDark
    ? ['#030305', '#08060F', '#030305']
    : ['#F0EFFE', '#EDE9FE', '#F4F4F5'];

  // Colores del gradiente del botón
  const btnGradient: [string, string] = [PRP, IND];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Fondo con gradiente */}
      <LinearGradient
        colors={bgGradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Orbes de luz de fondo */}
      <View style={[s.orb1, { backgroundColor: isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.10)' }]} />
      <View style={[s.orb2, { backgroundColor: isDark ? 'rgba(79,70,229,0.12)' : 'rgba(79,70,229,0.07)' }]} />

      {/* Partículas flotantes */}
      {PTCLS.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position:        'absolute',
            left:            p.left as any,
            top:             p.top  as any,
            width:           p.size,
            height:          p.size,
            borderRadius:    p.size / 2,
            backgroundColor: isDark ? VLT : PRP,
            opacity:         ptclOp[i],
            transform:       [{ translateY: ptclY[i] }],
          }}
        />
      ))}

      {/* Toggle modo oscuro */}
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
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={t.toggleIcon} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo con anillo pulsante */}
        <Animated.View style={[s.logoSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          {/* Anillo pulsante */}
          <Animated.View
            style={[
              s.logoRing,
              {
                borderColor: PRP,
                opacity: logoRing.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
                transform: [{ scale: logoRing.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.28] }) }],
              },
            ]}
            pointerEvents="none"
          />
          {/* Tarjeta del logo con gradiente */}
          <LinearGradient
            colors={[PRP, IND]}
            style={s.logoCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.logoLetter}>S</Text>
          </LinearGradient>
          <Text style={[s.brand, { color: t.brandColor }]}>StockIQ</Text>
          <Text style={[s.brandSub, { color: t.brandSub }]}>Sistema de Auditoría de Inventarios</Text>
        </Animated.View>

        {/* Tarjeta de login glassmorphism */}
        <Animated.View style={[
          s.card,
          {
            backgroundColor: t.cardBg,
            borderColor:     t.cardBorder,
            opacity:         cardOpacity,
            transform:       [{ translateX: shake }, { translateY: cardY }],
          },
        ]}>
          <View style={[s.glassHighlight, { backgroundColor: t.highlightLine }]} />

          <Text style={[s.cardTitle, { color: t.title }]}>Iniciar sesión</Text>
          <Text style={[s.cardSub,   { color: t.sub   }]}>Ingresa con tu cédula y contraseña</Text>

          {mensajeExtra ? (
            <View style={[s.errBox, { backgroundColor: t.errBg, borderLeftColor: t.errBorder }]}>
              <Ionicons name="alert-circle" size={15} color={t.errTxt} />
              <Text style={[s.errTxtStyle, { color: t.errTxt }]}>{mensajeExtra}</Text>
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
                <Ionicons name="person-outline" size={17} color={cedulaFocus ? VLT : t.iconColor} />
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
                <Ionicons name="lock-closed-outline" size={17} color={passFocus ? VLT : t.iconColor} />
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
            <View
              style={[s.errBox, { backgroundColor: t.errBg, borderLeftColor: t.errBorder }]}
              accessibilityLiveRegion="assertive"
            >
              <Ionicons name="alert-circle" size={15} color={t.errTxt} />
              <Text style={[s.errTxtStyle, { color: t.errTxt }]}>{error}</Text>
            </View>
          ) : null}

          {/* Botón ingresar con gradiente */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 4 }}>
            <TouchableOpacity
              onPress={login}
              onPressIn={() => pressIn(btnScale)}
              onPressOut={() => pressOut(btnScale)}
              disabled={loading}
              activeOpacity={1}
              accessibilityLabel="Ingresar"
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
            >
              <LinearGradient
                colors={loading ? ['#5B21B6', '#3730A3'] : btnGradient}
                style={[s.loginBtn, loading && { opacity: 0.80 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={s.loginBtnTxt}>Ingresar</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Acceso rápido — solo __DEV__ */}
        {__DEV__ && (
          <View style={[s.demo, { backgroundColor: t.demoBg, borderColor: t.demoBorder }]}>
            <View style={s.demoHeader}>
              <View style={[s.demoLineView, { backgroundColor: t.demoLine }]} />
              <Text style={[s.demoLbl, { color: t.demoLbl }]}>Acceso rápido · Solo Dev</Text>
              <View style={[s.demoLineView, { backgroundColor: t.demoLine }]} />
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
                  <Text style={[s.rolTxt, { color: u.rol === 'SUPERADMIN' ? VLT : MTD }]}>
                    {u.rol === 'SUPERADMIN' ? 'Super Admin' : u.rol === 'ADMIN' ? 'Admin' : 'Contador'}
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
  // Orbes de fondo
  orb1: { position: 'absolute', width: 460, height: 460, borderRadius: 230, top: -160, right: -110 },
  orb2: { position: 'absolute', width: 340, height: 340, borderRadius: 170, bottom: 40,  left:  -80 },

  // Toggle
  themeToggleWrap: { position: 'absolute', top: 56, right: 20, zIndex: 20 },
  themeToggle:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 72, paddingBottom: 40 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    position:     'absolute',
    top:          -10,
    width:        96,
    height:       96,
    borderRadius: 48,
    borderWidth:  1.5,
  },
  logoCard: {
    width: 76, height: 76, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: PRP, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65, shadowRadius: 28, elevation: 14,
  },
  logoLetter: { fontSize: 40, fontWeight: '900', color: '#FFFFFF' },
  brand:      { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  brandSub:   { fontSize: 12, textAlign: 'center', letterSpacing: 0.3 },

  // Tarjeta glassmorphism
  card: {
    borderRadius: 28, padding: 24, marginBottom: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.20, shadowRadius: 36, elevation: 18, overflow: 'hidden',
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: 32, right: 32, height: 1,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.3 },
  cardSub:   { fontSize: 13, marginBottom: 24 },

  // Campos
  fieldWrap:    { marginBottom: 12 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  inputFocused: {
    shadowColor: PRP, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  inputIcon: { width: 46, alignItems: 'center', justifyContent: 'center', height: 52, borderRightWidth: 1 },
  input:     { flex: 1, height: 52, paddingHorizontal: 14, fontSize: 15 },
  eyeBtn:    { paddingHorizontal: 14, height: 52, alignItems: 'center', justifyContent: 'center' },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3,
  },
  errTxtStyle: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Botón
  loginBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, height: 54 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // Dev acceso rápido
  demo:       { borderRadius: 22, padding: 16, marginBottom: 20, borderWidth: 1 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  demoLineView:{ flex: 1, height: 1 },
  demoLbl:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  demoItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  demoName:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  demoCed:    { fontSize: 11 },
  rolPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolTxt:     { fontSize: 11, fontWeight: '600' },

  ver: { textAlign: 'center', fontSize: 11, marginTop: 4, letterSpacing: 0.5 },
});
