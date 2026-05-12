// TODO: Endpoint principal — recibe fecha y ubicación, devuelve eventos astrológicos del día
// Parámetros esperados: { fecha: "YYYY-MM-DD", lat: number, lon: number }
// Respuesta esperada: { planetas, aspectos, lunaFase, ... }

export default function handler(req, res) {
  res.status(501).json({ error: 'Not implemented' });
}
