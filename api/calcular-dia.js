// Endpoint principal del motor astrológico.
// Recibe una fecha (y hora opcional) y devuelve posiciones planetarias,
// fase lunar, aspectos y metadatos enriquecidos para esa fecha UTC.
//
// URL: GET /api/calcular-dia?fecha=YYYY-MM-DD&hora=HH:MM
// Auth: header x-api-key debe coincidir con alguna key de ALLOWED_API_KEYS

import { createRequire } from 'module';
import { getAllPlanetsPositions, getMoonPhase, getSignFromLongitude } from '../lib/ephemeris.js';
import { calculateAspectsForDay, getMajorAspectsOfDay }               from '../lib/aspectos.js';

// Importar package.json para leer la versión sin hardcodearla
const require  = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json');

// ─── Autenticación ────────────────────────────────────────────────────────────
// Set construido una sola vez al cargar el módulo — O(1) en cada request.
// Si ALLOWED_API_KEYS está vacío o ausente, el Set queda vacío → todo falla en 401.
// Esto es seguro por defecto: sin config explícita = sin acceso.
const VALID_KEYS = new Set(
  (process.env.ALLOWED_API_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean)
);

// ─── Validación de parámetros ─────────────────────────────────────────────────

// Formato YYYY-MM-DD con mes y día estrictamente válidos
const DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
// Formato HH:MM con horas 00-23 y minutos 00-59
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const MIN_DATE = new Date('1900-01-01T00:00:00Z');
const MAX_DATE = new Date('2100-12-31T23:59:59Z');

const DEFAULT_HORA = '12:00';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Redondea a 2 decimales — resolución suficiente para astrología (0.01° ≈ 36") */
function r2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Parsea fecha y hora a un objeto Date UTC.
 * Usa Date.UTC para ser inmune a la timezone del sistema donde corre el proceso.
 */
function parseDateUTC(fecha, hora) {
  const [year, month, day]   = fecha.split('-').map(Number);
  const [hour, minute]       = hora.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
}

/**
 * Enriquece la posición raw de un planeta con info de signo.
 * Devuelve el objeto listo para incluir en la response.
 */
function enrichPlanet(position) {
  const { sign, degree_in_sign } = getSignFromLongitude(position.longitude);
  return {
    signo:          sign.id,
    grado_en_signo: r2(degree_in_sign),
    grado_total:    r2(position.longitude),
    retrogrado:     position.isRetrograde,
    elemento:       sign.elemento,
    modalidad:      sign.modalidad,
  };
}

/**
 * Formatea un aspecto del array de calculateAspectsForDay / getMajorAspectsOfDay
 * al formato de respuesta acordado.
 */
function formatAspect(asp) {
  return {
    planeta1:  asp.planet1,
    planeta2:  asp.planet2,
    aspecto: {
      id:      asp.aspect.id,
      nombre:  asp.aspect.nombre,
      angulo:  asp.aspect.angulo,
      orbe_max: asp.aspect.orbe,
      peso:    asp.aspect.peso,
    },
    orbe:      asp.orb_difference,
    aplicativo: asp.applying,
    exacto_hoy: asp.exact_today,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Solo GET permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ① Autenticación
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !VALID_KEYS.has(apiKey)) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }

  // ② Validación de parámetros
  const { fecha, hora = DEFAULT_HORA } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Parámetro requerido: fecha (formato YYYY-MM-DD)' });
  }
  if (!DATE_RE.test(fecha)) {
    return res.status(400).json({ error: `Formato de fecha inválido: "${fecha}". Se esperaba YYYY-MM-DD` });
  }
  if (!TIME_RE.test(hora)) {
    return res.status(400).json({ error: `Formato de hora inválido: "${hora}". Se esperaba HH:MM` });
  }

  // ③ Parsear a Date UTC y verificar rango
  const dt = parseDateUTC(fecha, hora);

  if (dt < MIN_DATE || dt > MAX_DATE) {
    return res.status(400).json({
      error: `Fecha fuera de rango. Se admite entre 1900-01-01 y 2100-12-31. Recibida: "${fecha}"`,
    });
  }

  // ④–⑧ Cálculo y ensamblado de respuesta
  try {
    // Calcular posiciones de los 10 planetas (una sola llamada)
    const positions = getAllPlanetsPositions(dt);

    // Calcular fase lunar
    const moonPhase = getMoonPhase(dt);

    // Calcular aspectos
    const allAspects = calculateAspectsForDay(positions);
    const top3       = getMajorAspectsOfDay(positions, 3);

    // Separar luminarias del resto de planetas
    const { sol: solPos, luna: lunaPos, ...restPositions } = positions;

    // Enriquecer Sol
    const { sign: solSign, degree_in_sign: solDegree } = getSignFromLongitude(solPos.longitude);
    const solData = {
      signo:          solSign.id,
      grado_en_signo: r2(solDegree),
      grado_total:    r2(solPos.longitude),
      retrogrado:     solPos.isRetrograde,
      elemento:       solSign.elemento,
      modalidad:      solSign.modalidad,
    };

    // Enriquecer Luna (campos únicos por ser luminaria con fase)
    const { sign: lunaSign, degree_in_sign: lunaDegree } = getSignFromLongitude(lunaPos.longitude);
    const lunaData = {
      signo:                 lunaSign.id,
      grado_en_signo:        r2(lunaDegree),
      grado_total:           r2(lunaPos.longitude),
      fase:                  moonPhase.phase_name.toLowerCase(),
      iluminacion_porcentaje: moonPhase.illumination_percent,
      edad_dias:             moonPhase.age_days,
      elemento:              lunaSign.elemento,
      modalidad:             lunaSign.modalidad,
    };

    // Enriquecer los 8 planetas restantes
    const planetasData = {};
    for (const [id, pos] of Object.entries(restPositions)) {
      planetasData[id] = enrichPlanet(pos);
    }

    // Derivar retrógrados activos (todos los 10 planetas, incluidas luminarias)
    const retrogradosActivos = Object.entries(positions)
      .filter(([, pos]) => pos.isRetrograde)
      .map(([id]) => id);

    // Filtrar aspectos exactos hoy
    const aspectosExactos = allAspects.filter(a => a.exact_today);

    // Agregar score a top3 y formatear todos los aspectos
    const response = {
      fecha,
      hora_utc:              hora,
      version:               VERSION,
      generado_en:           new Date().toISOString(),
      sol:                   solData,
      luna:                  lunaData,
      planetas:              planetasData,
      aspectos_top_3:        top3.map(a => ({ ...formatAspect(a), score: a.score })),
      aspectos_todos:        allAspects.map(formatAspect),
      aspectos_exactos_hoy:  aspectosExactos.map(formatAspect),
      retrogrados_activos:   retrogradosActivos,
      aspectos_count:        allAspects.length,
      retrogrados_count:     retrogradosActivos.length,
      aspectos_exactos_count: aspectosExactos.length,
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);

  } catch (err) {
    // Loguear el error real para debugging pero no exponerlo al cliente
    console.error('[calcular-dia] Error en cálculo:', err);
    return res.status(500).json({ error: 'Error interno al calcular datos astrológicos' });
  }
}
