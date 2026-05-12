// Constantes astrológicas centrales — fuente de verdad para todo el motor

// Los 12 signos del zodíaco con su rango en grados eclípticos (0–360),
// elemento y modalidad
export const SIGNOS = [
  { id: 'aries',       nombre: 'Aries',       inicio: 0,   fin: 30,  elemento: 'fuego', modalidad: 'cardinal', regente: 'marte',    regente_moderno: null,      opuesto: 'libra'       },
  { id: 'tauro',       nombre: 'Tauro',       inicio: 30,  fin: 60,  elemento: 'tierra', modalidad: 'fijo',    regente: 'venus',    regente_moderno: null,      opuesto: 'escorpio'    },
  { id: 'geminis',     nombre: 'Géminis',     inicio: 60,  fin: 90,  elemento: 'aire',  modalidad: 'mutable',  regente: 'mercurio', regente_moderno: null,      opuesto: 'sagitario'   },
  { id: 'cancer',      nombre: 'Cáncer',      inicio: 90,  fin: 120, elemento: 'agua',  modalidad: 'cardinal', regente: 'luna',     regente_moderno: null,      opuesto: 'capricornio' },
  { id: 'leo',         nombre: 'Leo',         inicio: 120, fin: 150, elemento: 'fuego', modalidad: 'fijo',     regente: 'sol',      regente_moderno: null,      opuesto: 'acuario'     },
  { id: 'virgo',       nombre: 'Virgo',       inicio: 150, fin: 180, elemento: 'tierra', modalidad: 'mutable', regente: 'mercurio', regente_moderno: null,      opuesto: 'piscis'      },
  { id: 'libra',       nombre: 'Libra',       inicio: 180, fin: 210, elemento: 'aire',  modalidad: 'cardinal', regente: 'venus',    regente_moderno: null,      opuesto: 'aries'       },
  { id: 'escorpio',    nombre: 'Escorpio',    inicio: 210, fin: 240, elemento: 'agua',  modalidad: 'fijo',     regente: 'marte',    regente_moderno: 'pluton',  opuesto: 'tauro'       },
  { id: 'sagitario',   nombre: 'Sagitario',   inicio: 240, fin: 270, elemento: 'fuego', modalidad: 'mutable',  regente: 'jupiter',  regente_moderno: null,      opuesto: 'geminis'     },
  { id: 'capricornio', nombre: 'Capricornio', inicio: 270, fin: 300, elemento: 'tierra', modalidad: 'cardinal', regente: 'saturno', regente_moderno: null,      opuesto: 'cancer'      },
  { id: 'acuario',     nombre: 'Acuario',     inicio: 300, fin: 330, elemento: 'aire',  modalidad: 'fijo',     regente: 'saturno',  regente_moderno: 'urano',   opuesto: 'leo'         },
  { id: 'piscis',      nombre: 'Piscis',      inicio: 330, fin: 360, elemento: 'agua',  modalidad: 'mutable',  regente: 'jupiter',  regente_moderno: 'neptuno', opuesto: 'virgo'       },
];

// Planetas a calcular con su identificador numérico de sweph (SE_SUN = 0, etc.)
// Referencia: https://www.astro.com/swisseph/swephprg.htm#_Toc58931173
export const PLANETAS = [
  { id: 'sol',      nombre: 'Sol',      swephId: 0  },
  { id: 'luna',     nombre: 'Luna',     swephId: 1  },
  { id: 'mercurio', nombre: 'Mercurio', swephId: 2  },
  { id: 'venus',    nombre: 'Venus',    swephId: 3  },
  { id: 'marte',    nombre: 'Marte',    swephId: 4  },
  { id: 'jupiter',  nombre: 'Júpiter',  swephId: 5  },
  { id: 'saturno',  nombre: 'Saturno',  swephId: 6  },
  { id: 'urano',    nombre: 'Urano',    swephId: 7  },
  { id: 'neptuno',  nombre: 'Neptuno',  swephId: 8  },
  { id: 'pluton',   nombre: 'Plutón',   swephId: 9  },
];

// Los 5 aspectos mayores con su ángulo exacto y orbe máximo permitido (en grados)
// El orbe define cuánto puede desviarse el ángulo real del ángulo exacto
// peso: importancia para ranking de contenido TikTok — aspectos tensos primero
export const ASPECTOS = [
  { id: 'conjuncion', nombre: 'Conjunción', angulo: 0,   orbe: 8, peso: 5 },
  { id: 'sextil',     nombre: 'Sextil',     angulo: 60,  orbe: 4, peso: 2 },
  { id: 'cuadratura', nombre: 'Cuadratura', angulo: 90,  orbe: 6, peso: 4 },
  { id: 'trigono',    nombre: 'Trígono',    angulo: 120, orbe: 6, peso: 2 },
  { id: 'oposicion',  nombre: 'Oposición',  angulo: 180, orbe: 8, peso: 4 },
];
