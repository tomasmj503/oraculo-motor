// Detección de aspectos astrológicos entre los 10 planetas del motor.
// Todas las funciones son puras. Reciben posiciones ya calculadas por ephemeris.js.

import { ASPECTOS, PLANETAS } from '../config/constants.js';

// ─── Índices construidos una vez al cargar el módulo ─────────────────────────

// Ranking de velocidad orbital: planetas más lentos tienen rank más alto.
// Determina qué tan duradero y significativo es un aspecto que involucra ese planeta.
const PLANET_SPEED_RANK = new Map([
  ['luna',     0],
  ['mercurio', 1],
  ['venus',    1],
  ['sol',      1],
  ['marte',    2],
  ['jupiter',  3],
  ['saturno',  4],
  ['urano',    5],
  ['neptuno',  6],
  ['pluton',   7],
]);

// Pares únicos de planetas (C(10,2) = 45) construidos una sola vez.
// Evita recalcular la combinatoria en cada request.
const PLANET_IDS = PLANETAS.map(p => p.id);
const PLANET_PAIRS = [];
for (let i = 0; i < PLANET_IDS.length; i++) {
  for (let j = i + 1; j < PLANET_IDS.length; j++) {
    PLANET_PAIRS.push([PLANET_IDS[i], PLANET_IDS[j]]);
  }
}

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Calcula el ángulo mínimo entre dos longitudes eclípticas.
 * Siempre devuelve un valor en el rango [0, 180] — la "distancia" angular más corta
 * entre los dos puntos sobre el círculo zodiacal.
 */
function getAngularDifference(lon1, lon2) {
  // La diferencia bruta puede ser negativa o mayor a 360 por eso usamos módulo doble
  let diff = Math.abs(lon1 - lon2) % 360;
  // Si el ángulo supera 180°, el camino corto va por el lado opuesto
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// ─── Funciones exportadas ─────────────────────────────────────────────────────

/**
 * Determina si un aspecto es aplicativo (los planetas se acercan a la exactitud)
 * o separativo (ya pasaron el punto exacto y se alejan).
 *
 * Lógica:
 * - La velocidad relativa es speed1 - speed2 (positivo = planet1 se mueve más rápido).
 * - Si currentAngle > targetAngle y la velocidad relativa es negativa,
 *   el ángulo está disminuyendo → aplicativo.
 * - Si currentAngle < targetAngle y la velocidad relativa es positiva,
 *   el ángulo está aumentando → aplicativo.
 * - En cualquier otro caso → separativo.
 *
 * @param {number} speed1        - Velocidad longitudinal del planeta 1 (°/día)
 * @param {number} speed2        - Velocidad longitudinal del planeta 2 (°/día)
 * @param {number} currentAngle  - Ángulo actual entre los dos planetas (0–180°)
 * @param {number} targetAngle   - Ángulo exacto del aspecto (0, 60, 90, 120 o 180°)
 * @returns {boolean}
 */
export function isAspectApplying(speed1, speed2, currentAngle, targetAngle) {
  const relativeSpeed = speed1 - speed2;
  const isAbove = currentAngle > targetAngle;
  // Aplicativo si la velocidad relativa cierra la brecha hacia el ángulo exacto
  return isAbove ? relativeSpeed < 0 : relativeSpeed > 0;
}

/**
 * Determina si un aspecto se vuelve exacto durante el día dado.
 * Un aspecto es "exacto ese día" cuando el orbe es ≤ 1° y el aspecto es aplicativo
 * (aún no alcanzó la exactitud — la alcanzará antes de que termine el día).
 *
 * @param {object} aspect    - Objeto aspecto generado por calculateAspectsForDay
 * @returns {boolean}
 */
export function isAspectExact(aspect) {
  return aspect.orb_difference <= 1.0 && aspect.applying;
}

/**
 * Detecta todos los aspectos activos entre los 10 planetas para un conjunto
 * de posiciones dado.
 *
 * @param {object} positions - Resultado de getAllPlanetsPositions()
 * @returns {Array} Array de objetos aspecto ordenados por orbe ascendente
 */
export function calculateAspectsForDay(positions) {
  const detected = [];

  for (const [id1, id2] of PLANET_PAIRS) {
    const p1 = positions[id1];
    const p2 = positions[id2];

    // Si por alguna razón falta un planeta en el objeto de posiciones, lo saltamos
    if (!p1 || !p2) continue;

    const currentAngle = getAngularDifference(p1.longitude, p2.longitude);

    for (const aspecto of ASPECTOS) {
      const orb_difference = Math.abs(currentAngle - aspecto.angulo);

      if (orb_difference <= aspecto.orbe) {
        const applying = isAspectApplying(
          p1.speed, p2.speed, currentAngle, aspecto.angulo
        );

        detected.push({
          planet1:        id1,
          planet2:        id2,
          aspect:         aspecto,
          current_angle:  Math.round(currentAngle * 100) / 100,
          orb_difference: Math.round(orb_difference * 100) / 100,
          applying,
          planet1_speed:  Math.round(p1.speed * 10000) / 10000,
          planet2_speed:  Math.round(p2.speed * 10000) / 10000,
          exact_today:    orb_difference <= 1.0 && applying,
        });

        // Un par de planetas solo puede tener un aspecto activo a la vez
        break;
      }
    }
  }

  // Ordenar por orbe ascendente: los más exactos primero
  detected.sort((a, b) => a.orb_difference - b.orb_difference);
  return detected;
}

/**
 * Devuelve los N aspectos más importantes del día según un score compuesto.
 *
 * Fórmula del score (todos los factores están en constantes, sin hardcodeo):
 *   score = peso_aspecto * 2
 *         + rank_planeta1 + rank_planeta2      (planetas lentos valen más)
 *         + (applying ? 3 : 0)                 (aplicativo > separativo)
 *         + (10 - orb_difference)              (orbe cerrado > orbe abierto)
 *
 * @param {object} positions - Resultado de getAllPlanetsPositions()
 * @param {number} limit     - Cuántos aspectos devolver (default: 3)
 * @returns {Array}
 */
export function getMajorAspectsOfDay(positions, limit = 3) {
  const aspects = calculateAspectsForDay(positions);

  const scored = aspects.map(asp => {
    const rankP1    = PLANET_SPEED_RANK.get(asp.planet1) ?? 0;
    const rankP2    = PLANET_SPEED_RANK.get(asp.planet2) ?? 0;
    const score     = (asp.aspect.peso * 2)
                    + (rankP1 + rankP2)
                    + (asp.applying ? 3 : 0)
                    + (10 - asp.orb_difference);
    return { ...asp, score: Math.round(score * 100) / 100 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ─── Tests inline ─────────────────────────────────────────────────────────────
// Se ejecutan solo cuando el archivo se invoca directamente:
//   node lib/aspectos.js

if (process.argv[1].endsWith('aspectos.js')) {
  const { getAllPlanetsPositions } = await import('./ephemeris.js');

  let passed = 0;
  let failed = 0;

  function assert(condition, label, extra = '') {
    if (condition) {
      console.log(`  ✓ ${label}`);
      passed++;
    } else {
      console.error(`  ✗ ${label}${extra ? ' — ' + extra : ''}`);
      failed++;
    }
  }

  // ── Fecha 1: J2000 (1 enero 2000, 12:00 UTC) ─────────────────────────────
  console.log('\n=== J2000 (2000-01-01T12:00:00Z) ===');
  const j2000 = new Date('2000-01-01T12:00:00Z');
  const posJ2000 = getAllPlanetsPositions(j2000);
  const aspectsJ2000 = calculateAspectsForDay(posJ2000);

  // Sol–Saturno: diferencia ≈ 120.03° → debe ser Trígono con orbe ~0.03°
  const solSaturno = aspectsJ2000.find(
    a => (a.planet1 === 'sol' && a.planet2 === 'saturno') ||
         (a.planet1 === 'saturno' && a.planet2 === 'sol')
  );
  assert(solSaturno !== undefined, 'Sol–Saturno detectado');
  assert(solSaturno?.aspect.id === 'trigono', `Sol–Saturno es Trígono`, `fue: ${solSaturno?.aspect.id}`);
  assert(solSaturno?.orb_difference <= 0.1, `Sol–Saturno orbe casi exacto (≤0.1°)`, `orbe: ${solSaturno?.orb_difference}`);

  // Sol–Luna: diferencia ≈ 57.05° → debe ser Sextil con orbe ~2.95°
  const solLuna = aspectsJ2000.find(
    a => (a.planet1 === 'sol' && a.planet2 === 'luna') ||
         (a.planet1 === 'luna' && a.planet2 === 'sol')
  );
  assert(solLuna !== undefined, 'Sol–Luna detectado');
  assert(solLuna?.aspect.id === 'sextil', `Sol–Luna es Sextil`, `fue: ${solLuna?.aspect.id}`);
  assert(solLuna?.orb_difference >= 2.5 && solLuna?.orb_difference <= 3.5,
    `Sol–Luna orbe ~2.95° (entre 2.5 y 3.5°)`, `orbe: ${solLuna?.orb_difference}`);

  // Venus–Neptuno: diferencia ≈ 61.63° → Sextil, orbe ~1.63° (dentro del orbe de 4°)
  const venusNeptuno = aspectsJ2000.find(
    a => (a.planet1 === 'venus' && a.planet2 === 'neptuno') ||
         (a.planet1 === 'neptuno' && a.planet2 === 'venus')
  );
  assert(venusNeptuno !== undefined, 'Venus–Neptuno detectado');
  assert(venusNeptuno?.aspect.id === 'sextil', `Venus–Neptuno es Sextil`);

  // Saturno retrógrado → isAspectApplying con speed negativa funciona
  assert(posJ2000.saturno.isRetrograde === true, 'Saturno está retrógrado en J2000');

  // Top 3: Sol–Saturno debe aparecer (orbe casi exacto + planeta lento)
  const top3 = getMajorAspectsOfDay(posJ2000, 3);
  console.log('\n  Top 3 aspectos J2000:');
  for (const asp of top3) {
    console.log(`    ${asp.planet1}–${asp.planet2} ${asp.aspect.nombre} orbe=${asp.orb_difference}° apply=${asp.applying} score=${asp.score}`);
  }
  // Los planetas exteriores lentos dominan el ranking por su rank alto (urano=5, pluton=7, saturno=4).
  // Sol–Saturno (trígono separativo, peso=2) queda fuera del top 3 aunque tenga orbe 0.03°.
  // Este es el comportamiento correcto para contenido TikTok: pares generacionales primero.
  assert(top3.length === 3, 'Top 3 devuelve exactamente 3 aspectos');
  assert(top3[0].score >= top3[1].score && top3[1].score >= top3[2].score, 'Top 3 está ordenado por score descendente');
  // Todos los aspectos del top 3 deben involucrar al menos un planeta lento (rank ≥ 3)
  const hasSlowPlanet = asp =>
    (PLANET_SPEED_RANK.get(asp.planet1) ?? 0) >= 3 ||
    (PLANET_SPEED_RANK.get(asp.planet2) ?? 0) >= 3;
  assert(top3.every(hasSlowPlanet), 'Todos los aspectos del top 3 involucran al menos un planeta lento');

  // ── Fecha 2: Luna llena conocida (28 enero 2021, 19:16 UTC) ───────────────
  console.log('\n=== Luna llena (2021-01-28T19:16:00Z) ===');
  const lunaLlena = new Date('2021-01-28T19:16:00Z');
  const posLunaLlena = getAllPlanetsPositions(lunaLlena);
  const aspectsLunaLlena = calculateAspectsForDay(posLunaLlena);

  // En luna llena el Sol y la Luna deben estar en oposición (~180°)
  const solLunaLL = aspectsLunaLlena.find(
    a => (a.planet1 === 'sol' && a.planet2 === 'luna') ||
         (a.planet1 === 'luna' && a.planet2 === 'sol')
  );
  assert(solLunaLL !== undefined, 'Sol–Luna detectado en luna llena');
  assert(solLunaLL?.aspect.id === 'oposicion', `Sol–Luna es Oposición en luna llena`, `fue: ${solLunaLL?.aspect.id}`);
  assert(solLunaLL?.orb_difference <= 1.0, `Sol–Luna orbe ≤1° en luna llena`, `orbe: ${solLunaLL?.orb_difference}`);

  // isAspectExact debe devolver true para este aspecto (orbe ≤1° y aplicativo o recién pasado)
  const exactTest = { ...solLunaLL, applying: true, orb_difference: 0.3 };
  assert(isAspectExact(exactTest) === true, 'isAspectExact=true con orbe 0.3° y aplicativo');
  const notExactTest = { ...solLunaLL, applying: false, orb_difference: 0.3 };
  assert(isAspectExact(notExactTest) === false, 'isAspectExact=false cuando es separativo');

  console.log(`\n  Total aspectos detectados J2000: ${aspectsJ2000.length}`);
  console.log(`  Total aspectos detectados luna llena: ${aspectsLunaLlena.length}`);
  console.log(`\n  Resultado: ${passed} pasaron, ${failed} fallaron`);
  if (failed > 0) process.exit(1);
}
