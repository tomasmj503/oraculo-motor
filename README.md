# oraculo-motor

Motor astrológico determinístico para JUTILABS Oráculo Diario. Microservicio Node.js desplegado en Vercel que expone endpoints para calcular eventos astrológicos reales usando Swiss Ephemeris.

## Requisitos

- Node.js >= 20
- Vercel CLI (instalado como devDependency)
- Archivos de efemérides de Swiss Ephemeris (ver `SWEPH_EPHE_PATH` en `.env.example`)

## Configuración local

1. Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

2. Instala dependencias:

```bash
npm install
```

## Correr en desarrollo

```bash
npm run dev
```

El servidor arranca en `http://localhost:3000`. Los endpoints disponibles son:

- `GET /api/health` — healthcheck
- `POST /api/calcular-dia` — (pendiente de implementar)

## Correr tests

```bash
npm test
```

## Deployar a producción

```bash
npm run deploy
```

Requiere estar autenticado con `vercel login` y tener el proyecto vinculado (`vercel link`).

## Variables de entorno

Ver `.env.example` para la lista completa de variables requeridas.
