// Auditoría astronómica — 13 de mayo de 2026, 12:00 UTC
// Comparar visualmente contra astro.com u otra fuente externa antes de continuar.

import { getAllPlanetsPositions, getMoonPhase, getSignFromLongitude } from '../lib/ephemeris.js';
import { calculateAspectsForDay, getMajorAspectsOfDay } from '../lib/aspectos.js';

const TARGET = new Date('2026-05-13T12:00:00Z');

const positions = getAllPlanetsPositions(TARGET);
const moonPhase = getMoonPhase(TARGET);
const aspects   = calculateAspectsForDay(positions);
const top3      = getMajorAspectsOfDay(positions, 3);

// ─── Tabla de planetas ────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log('  AUDITORÍA ASTRONÓMICA — 2026-05-13 12:00 UTC');
console.log('══════════════════════════════════════════════════════════\n');

console.log('PLANETA     LONGITUD      SIGNO          GRADO EN SIGNO   RETRÓGRADO');
console.log('─────────────────────────────────────────────────────────────────────');

for (const [id, pos] of Object.entries(positions)) {
  const { sign, degree_in_sign, dms } = getSignFromLongitude(pos.longitude);
  const retro  = pos.isRetrograde ? '← RETRÓGRADO' : '';
  const planet = id.padEnd(10);
  const lon    = pos.longitude.toFixed(4).padStart(9) + '°';
  const signo  = sign.nombre.padEnd(14);
  const grado  = `${dms.d}°${String(dms.m).padStart(2,'0')}'${String(dms.s).padStart(2,'0')}"`.padEnd(12);
  console.log(`${planet}  ${lon}   ${signo} ${grado}  ${retro}`);
}

// ─── Fase lunar ───────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log('FASE LUNAR');
console.log('─────────────────────────────────────────────────────────────────────');
console.log(`  Fase:         ${moonPhase.phase_name}`);
console.log(`  Iluminación:  ${moonPhase.illumination_percent}%`);
console.log(`  Edad lunar:   ${moonPhase.age_days} días`);

// ─── Top 3 aspectos ──────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log('ASPECTOS PRINCIPALES (top 3 por score)');
console.log('─────────────────────────────────────────────────────────────────────');

for (let i = 0; i < top3.length; i++) {
  const a     = top3[i];
  const dir   = a.applying ? 'aplicativo' : 'separativo';
  const exact = a.exact_today ? ' [EXACTO HOY]' : '';
  console.log(`  ${i + 1}. ${a.planet1} ${a.aspect.nombre} ${a.planet2}  orbe=${a.orb_difference}°  ${dir}  score=${a.score}${exact}`);
}

// ─── Todos los aspectos ───────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log(`TODOS LOS ASPECTOS ACTIVOS (${aspects.length} total)`);
console.log('─────────────────────────────────────────────────────────────────────');

for (const a of aspects) {
  const dir   = a.applying ? 'aplic.' : 'separ.';
  const exact = a.exact_today ? ' ★' : '';
  console.log(`  ${a.planet1.padEnd(10)} ${a.aspect.nombre.padEnd(12)} ${a.planet2.padEnd(10)}  orbe=${String(a.orb_difference).padStart(5)}°  ${dir}${exact}`);
}

console.log('\n══════════════════════════════════════════════════════════\n');
