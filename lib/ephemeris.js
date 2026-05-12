// Wrapper sobre Swiss Ephemeris (sweph) — fuente de todos los datos planetarios del motor.
// Todas las funciones son puras y sin estado. El caching pertenece a la capa de endpoint.

import sw from 'sweph';
import { SIGNOS, PLANETAS } from '../config/constants.js';

// ─── Flags de sweph ───────────────────────────────────────────────────────────

// SEFLG_MOSEPH (4): usa algoritmo Moshier integrado, no requiere archivos externos.
// Precisión ~0.1 segundos de arco — suficiente para uso astrológico.
// SEFLG_SWIEPH (2): usa archivos binarios .se1, mayor precisión.
// Se activa automáticamente si SWEPH_EPHE_PATH está configurado.
const SEFLG_SWIEPH = 2;
const SEFLG_MOSEPH = 4;
const SEFLG_SPEED  = 256; // incluye velocidades en el resultado
const SE_GREG_CAL  = 1;   // calendario gregoriano

// Si hay ruta de efemérides configurada, usamos los archivos .se1 (mayor precisión).
// En Vercel sin SWEPH_EPHE_PATH, Moshier se activa por defecto.
let CALC_FLAGS;
if (process.env.SWEPH_EPHE_PATH) {
  sw.set_ephe_path(process.env.SWEPH_EPHE_PATH);
  CALC_FLAGS = SEFLG_SWIEPH | SEFLG_SPEED;
} else {
  CALC_FLAGS = SEFLG_MOSEPH | SEFLG_SPEED;
}

// ─── Índice de planetas para lookups O(1) ─────────────────────────────────────

// Construido una sola vez al cargar el módulo — evita iterar PLANETAS en cada request.
const PLANET_INDEX = new Map(PLANETAS.map(p => [p.id, p]));

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Convierte un objeto Date de JavaScript (UTC) a Día Juliano.
 * El Día Juliano es el sistema de tiempo interno de Swiss Ephemeris.
 */
function dateToJulianDay(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('datetime inválido: se requiere un objeto Date válido');
  }

  const year   = date.getUTCFullYear();
  const month  = date.getUTCMonth() + 1;
  const day    = date.getUTCDate();

  // sweph espera la hora como fracción decimal del día (0.0 – 24.0)
  const hour = date.getUTCHours()
    + date.getUTCMinutes()   / 60
    + date.getUTCSeconds()   / 3600
    + date.getUTCMilliseconds() / 3_600_000;

  return sw.julday(year, month, day, hour, SE_GREG_CAL);
}

/**
 * Convierte grados decimales a grados/minutos/segundos.
 */
function decimalToDMS(decimal) {
  const total_seconds = Math.round(decimal * 3600);
  const d = Math.floor(total_seconds / 3600);
  const m = Math.floor((total_seconds % 3600) / 60);
  const s = total_seconds % 60;
  return { d, m, s };
}

// ─── Funciones exportadas ─────────────────────────────────────────────────────

/**
 * Devuelve el signo zodiacal correspondiente a una longitud eclíptica.
 *
 * @param {number} longitude - Longitud en grados (0–360)
 * @returns {{ sign: object, degree_in_sign: number, dms: { d, m, s } }}
 */
export function getSignFromLongitude(longitude) {
  // Normaliza por si acaso llega un valor fuera de rango
  const normalized = ((longitude % 360) + 360) % 360;
  const index = Math.floor(normalized / 30);
  const sign = SIGNOS[index];
  const degree_in_sign = normalized - sign.inicio;

  return {
    sign,
    degree_in_sign,
    dms: decimalToDMS(degree_in_sign),
  };
}

/**
 * Calcula la posición de un planeta para una fecha/hora UTC dada.
 *
 * @param {string} planetId - ID del planeta según constants.js (ej: 'sol', 'luna')
 * @param {Date}   datetime - Fecha y hora en UTC
 * @returns {{ longitude, latitude, distance, speed, isRetrograde }}
 */
export function getPlanetPosition(planetId, datetime) {
  const planet = PLANET_INDEX.get(planetId);
  if (!planet) {
    throw new Error(`Planeta desconocido: "${planetId}". IDs válidos: ${[...PLANET_INDEX.keys()].join(', ')}`);
  }

  const jd = dateToJulianDay(datetime);
  const result = sw.calc_ut(jd, planet.swephId, CALC_FLAGS);

  if (result.error) {
    throw new Error(`sweph error calculando ${planetId}: ${result.error}`);
  }

  // data[0]=longitud, [1]=latitud, [2]=distancia (AU),
  // [3]=velocidad longitud, [4]=velocidad latitud, [5]=velocidad distancia
  const [longitude, latitude, distance, speed] = result.data;

  return {
    longitude,
    latitude,
    distance,
    speed,
    isRetrograde: speed < 0,
  };
}

/**
 * Calcula las posiciones de los 10 planetas para una fecha/hora UTC dada.
 * Reutiliza el Día Juliano para evitar reconvertir la fecha 10 veces.
 *
 * @param {Date} datetime - Fecha y hora en UTC
 * @returns {Object} Objeto indexado por planetId con posición de cada planeta
 */
export function getAllPlanetsPositions(datetime) {
  const jd = dateToJulianDay(datetime);
  const positions = {};

  for (const planet of PLANETAS) {
    const result = sw.calc_ut(jd, planet.swephId, CALC_FLAGS);

    if (result.error) {
      throw new Error(`sweph error calculando ${planet.id}: ${result.error}`);
    }

    const [longitude, latitude, distance, speed] = result.data;

    positions[planet.id] = {
      longitude,
      latitude,
      distance,
      speed,
      isRetrograde: speed < 0,
    };
  }

  return positions;
}

/**
 * Calcula la fase lunar para una fecha/hora UTC dada.
 *
 * Usa pheno_ut que devuelve fenomenología del cuerpo celeste:
 *   data[0] = elongación geocéntrica Sol-Luna (0°–180°, sin sentido de dirección)
 *   data[1] = fracción del disco iluminado (0.0 = Luna nueva, 1.0 = Luna llena)
 *
 * Para determinar si la Luna está en fase creciente o menguante necesitamos
 * la longitud del Sol y de la Luna — si Luna > Sol (mod 360), es creciente.
 *
 * @param {Date} datetime - Fecha y hora en UTC
 * @returns {{ phase_name: string, illumination_percent: number, age_days: number }}
 */
export function getMoonPhase(datetime) {
  const jd = dateToJulianDay(datetime);

  const moonPheno = sw.pheno_ut(jd, 1, CALC_FLAGS); // 1 = Luna
  if (moonPheno.error) {
    throw new Error(`sweph error calculando fase lunar: ${moonPheno.error}`);
  }

  // Longitudes del Sol y la Luna para determinar creciente/menguante
  const sunResult  = sw.calc_ut(jd, 0, CALC_FLAGS); // 0 = Sol
  const moonResult = sw.calc_ut(jd, 1, CALC_FLAGS); // 1 = Luna
  if (sunResult.error || moonResult.error) {
    throw new Error('sweph error calculando posiciones Sol/Luna para fase');
  }

  const illumination_percent = Math.round(moonPheno.data[1] * 100 * 100) / 100;

  // Elongación angular Luna–Sol en sentido directo (0°–360°)
  // Si elongation_signed está entre 0–180, la Luna va adelante del Sol → creciente
  const sunLon  = sunResult.data[0];
  const moonLon = moonResult.data[0];
  const elongation_signed = ((moonLon - sunLon) + 360) % 360;

  // Edad lunar en días: la Luna recorre ~360° en 29.53 días (ciclo sinódico)
  const SYNODIC_MONTH = 29.53058770;
  const age_days = Math.round((elongation_signed / 360) * SYNODIC_MONTH * 100) / 100;

  // 8 fases basadas en la elongación directa Luna–Sol
  const phase_name = resolvePhaseName(elongation_signed);

  return {
    phase_name,
    illumination_percent,
    age_days,
  };
}

/**
 * Mapea la elongación directa Luna–Sol (0–360°) a una de las 8 fases lunares.
 * Los límites son simétricos alrededor de los 4 puntos cardinales.
 */
function resolvePhaseName(elongation) {
  if (elongation < 22.5 || elongation >= 337.5) return 'Nueva';
  if (elongation < 67.5)  return 'Creciente';
  if (elongation < 112.5) return 'Cuarto Creciente';
  if (elongation < 157.5) return 'Gibosa Creciente';
  if (elongation < 202.5) return 'Llena';
  if (elongation < 247.5) return 'Gibosa Menguante';
  if (elongation < 292.5) return 'Cuarto Menguante';
  return 'Menguante';
}
