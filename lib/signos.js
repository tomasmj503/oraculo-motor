// Información estructurada de los 12 signos zodiacales.
// Todas las funciones son puras. Los datos viven en config/constants.js.

import { SIGNOS } from '../config/constants.js';

// ─── Índice para lookups O(1) ─────────────────────────────────────────────────

const SIGN_INDEX = new Map(SIGNOS.map(s => [s.id, s]));

// ─── Tabla de compatibilidad elemental ───────────────────────────────────────
// Clave: elementos ordenados alfabéticamente y unidos por '-' (ej: 'agua-tierra')
// para que el lookup sea simétrico sin importar el orden de los argumentos.
const COMPATIBILITY = new Map([
  ['agua-agua',    'alta'],
  ['agua-tierra',  'alta'],
  ['aire-aire',    'alta'],
  ['aire-fuego',   'alta'],
  ['fuego-fuego',  'alta'],
  ['tierra-tierra','alta'],
  ['agua-aire',    'baja'],
  ['agua-fuego',   'baja'],
  ['aire-tierra',  'baja'],
  ['fuego-tierra', 'baja'],
]);

// ─── Helper interno ───────────────────────────────────────────────────────────

/**
 * Busca un signo en el índice y lanza error si no existe.
 * Centraliza la validación para no repetirla en cada función.
 */
function resolveSign(id) {
  const sign = SIGN_INDEX.get(id);
  if (!sign) {
    throw new Error(`Signo desconocido: "${id}". IDs válidos: ${[...SIGN_INDEX.keys()].join(', ')}`);
  }
  return sign;
}

// ─── Funciones exportadas ─────────────────────────────────────────────────────

/**
 * Devuelve el elemento del signo.
 * @param {string} signoId
 * @returns {'fuego'|'tierra'|'aire'|'agua'}
 */
export function getElement(signoId) {
  return resolveSign(signoId).elemento;
}

/**
 * Devuelve la modalidad del signo.
 * @param {string} signoId
 * @returns {'cardinal'|'fijo'|'mutable'}
 */
export function getModality(signoId) {
  return resolveSign(signoId).modalidad;
}

/**
 * Devuelve los planetas regentes del signo — clásico siempre presente,
 * moderno solo para los 3 signos con doble regencia (Escorpio, Acuario, Piscis).
 * @param {string} signoId
 * @returns {{ clasico: string, moderno: string|null }}
 */
export function getRuler(signoId) {
  const sign = resolveSign(signoId);
  return { clasico: sign.regente, moderno: sign.regente_moderno };
}

/**
 * Devuelve el signo diametralmente opuesto en el zodíaco.
 * Los 6 pares opuestos: Aries↔Libra, Tauro↔Escorpio, Géminis↔Sagitario,
 * Cáncer↔Capricornio, Leo↔Acuario, Virgo↔Piscis.
 * @param {string} signoId
 * @returns {string} ID del signo opuesto
 */
export function getOpposite(signoId) {
  return resolveSign(signoId).opuesto;
}

/**
 * Calcula la compatibilidad elemental entre dos signos.
 *
 * Devuelve un objeto con el nivel y flags adicionales de contexto
 * que la capa de presentación puede usar para matizar el mensaje.
 *
 * @param {string} signoId1
 * @param {string} signoId2
 * @returns {{ nivel: 'alta'|'media'|'baja', same_sign: boolean, same_element: boolean, same_modality: boolean }}
 */
export function getCompatibility(signoId1, signoId2) {
  const s1 = resolveSign(signoId1);
  const s2 = resolveSign(signoId2);

  const same_sign     = s1.id === s2.id;
  const same_element  = s1.elemento === s2.elemento;
  const same_modality = s1.modalidad === s2.modalidad;

  // Ordenar los elementos alfabéticamente para que la clave sea simétrica
  const elementos = [s1.elemento, s2.elemento].sort().join('-');
  const nivel = COMPATIBILITY.get(elementos) ?? 'media';

  return { nivel, same_sign, same_element, same_modality };
}

/**
 * Devuelve toda la información del signo en un objeto único.
 * Incluye el resultado de getRuler, getOpposite y getCompatibility consigo mismo
 * no tiene sentido aquí — el objeto es la ficha completa del signo.
 *
 * @param {string} signoId
 * @returns {object}
 */
export function getSignInfo(signoId) {
  const sign = resolveSign(signoId);
  return {
    id:              sign.id,
    nombre:          sign.nombre,
    elemento:        sign.elemento,
    modalidad:       sign.modalidad,
    regente:         { clasico: sign.regente, moderno: sign.regente_moderno },
    opuesto:         sign.opuesto,
    inicio_grados:   sign.inicio,
    fin_grados:      sign.fin,
  };
}

// ─── Tests inline ─────────────────────────────────────────────────────────────
// Ejecutar con: node lib/signos.js

if (process.argv[1]?.endsWith('signos.js')) {
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

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  console.log('\n=== getElement ===');
  assert(getElement('aries')       === 'fuego',  'Aries → fuego');
  assert(getElement('tauro')       === 'tierra', 'Tauro → tierra');
  assert(getElement('geminis')     === 'aire',   'Géminis → aire');
  assert(getElement('cancer')      === 'agua',   'Cáncer → agua');
  assert(getElement('capricornio') === 'tierra', 'Capricornio → tierra');

  console.log('\n=== getModality ===');
  assert(getModality('aries')      === 'cardinal', 'Aries → cardinal');
  assert(getModality('tauro')      === 'fijo',     'Tauro → fijo');
  assert(getModality('geminis')    === 'mutable',  'Géminis → mutable');
  assert(getModality('capricornio')=== 'cardinal', 'Capricornio → cardinal');

  console.log('\n=== getRuler ===');
  assert(deepEqual(getRuler('tauro'),      { clasico: 'venus',   moderno: null      }), 'Tauro → venus (sin moderno)');
  assert(deepEqual(getRuler('aries'),      { clasico: 'marte',   moderno: null      }), 'Aries → marte (sin moderno)');
  assert(deepEqual(getRuler('escorpio'),   { clasico: 'marte',   moderno: 'pluton'  }), 'Escorpio → marte / plutón');
  assert(deepEqual(getRuler('acuario'),    { clasico: 'saturno', moderno: 'urano'   }), 'Acuario → saturno / urano');
  assert(deepEqual(getRuler('piscis'),     { clasico: 'jupiter', moderno: 'neptuno' }), 'Piscis → júpiter / neptuno');
  assert(deepEqual(getRuler('leo'),        { clasico: 'sol',     moderno: null      }), 'Leo → sol (sin moderno)');
  assert(deepEqual(getRuler('cancer'),     { clasico: 'luna',    moderno: null      }), 'Cáncer → luna (sin moderno)');

  console.log('\n=== getOpposite (los 6 pares) ===');
  assert(getOpposite('aries')       === 'libra',       'Aries ↔ Libra');
  assert(getOpposite('libra')       === 'aries',       'Libra ↔ Aries');
  assert(getOpposite('tauro')       === 'escorpio',    'Tauro ↔ Escorpio');
  assert(getOpposite('escorpio')    === 'tauro',       'Escorpio ↔ Tauro');
  assert(getOpposite('geminis')     === 'sagitario',   'Géminis ↔ Sagitario');
  assert(getOpposite('sagitario')   === 'geminis',     'Sagitario ↔ Géminis');
  assert(getOpposite('cancer')      === 'capricornio', 'Cáncer ↔ Capricornio');
  assert(getOpposite('capricornio') === 'cancer',      'Capricornio ↔ Cáncer');
  assert(getOpposite('leo')         === 'acuario',     'Leo ↔ Acuario');
  assert(getOpposite('acuario')     === 'leo',         'Acuario ↔ Leo');
  assert(getOpposite('virgo')       === 'piscis',      'Virgo ↔ Piscis');
  assert(getOpposite('piscis')      === 'virgo',       'Piscis ↔ Virgo');

  console.log('\n=== getCompatibility ===');
  // Mismo signo
  assert(deepEqual(getCompatibility('aries', 'aries'), { nivel: 'alta', same_sign: true,  same_element: true,  same_modality: true  }), 'Aries+Aries → alta, same_sign=true');
  // Mismo elemento, distinta modalidad
  assert(deepEqual(getCompatibility('aries', 'leo'),   { nivel: 'alta', same_sign: false, same_element: true,  same_modality: false }), 'Aries+Leo → alta (fuego+fuego)');
  // Elementos compatibles: fuego+aire
  assert(getCompatibility('aries', 'libra').nivel   === 'alta', 'Aries+Libra → alta (fuego+aire, opuestos compatibles)');
  assert(getCompatibility('aries', 'libra').same_sign    === false, 'Aries+Libra → same_sign=false');
  assert(getCompatibility('aries', 'libra').same_element === false, 'Aries+Libra → same_element=false');
  // Tierra+agua: compatibles
  assert(getCompatibility('tauro', 'cancer').nivel  === 'alta', 'Tauro+Cáncer → alta (tierra+agua)');
  // Tierra+tierra
  assert(getCompatibility('tauro', 'virgo').nivel   === 'alta', 'Tauro+Virgo → alta (tierra+tierra)');
  // Fuego+agua: incompatibles
  assert(getCompatibility('aries', 'cancer').nivel  === 'baja', 'Aries+Cáncer → baja (fuego+agua)');
  // Fuego+tierra: incompatibles
  assert(getCompatibility('leo', 'tauro').nivel     === 'baja', 'Leo+Tauro → baja (fuego+tierra)');
  // Aire+agua: incompatibles
  assert(getCompatibility('geminis', 'cancer').nivel=== 'baja', 'Géminis+Cáncer → baja (aire+agua)');
  // Simetría: orden no importa
  assert(getCompatibility('cancer', 'tauro').nivel  === 'alta', 'Cáncer+Tauro (invertido) → alta');
  assert(getCompatibility('leo', 'geminis').nivel   === 'alta', 'Leo+Géminis (fuego+aire) → alta');

  console.log('\n=== getSignInfo ===');
  const capInfo = getSignInfo('capricornio');
  assert(capInfo.id              === 'capricornio', 'getSignInfo Capricornio: id correcto');
  assert(capInfo.elemento        === 'tierra',      'getSignInfo Capricornio: elemento tierra');
  assert(capInfo.modalidad       === 'cardinal',    'getSignInfo Capricornio: modalidad cardinal');
  assert(capInfo.regente.clasico === 'saturno',     'getSignInfo Capricornio: regente saturno');
  assert(capInfo.regente.moderno === null,           'getSignInfo Capricornio: sin regente moderno');
  assert(capInfo.opuesto         === 'cancer',      'getSignInfo Capricornio: opuesto cancer');
  assert(capInfo.inicio_grados   === 270,           'getSignInfo Capricornio: inicio 270°');
  assert(capInfo.fin_grados      === 300,           'getSignInfo Capricornio: fin 300°');

  console.log('\n=== manejo de errores ===');
  let errorThrown = false;
  try { getElement('escorpion'); } catch (e) { errorThrown = e.message.includes('escorpion'); }
  assert(errorThrown, 'Signo inexistente lanza error con el ID en el mensaje');

  console.log(`\n  Resultado: ${passed} pasaron, ${failed} fallaron`);
  if (failed > 0) process.exit(1);
}
