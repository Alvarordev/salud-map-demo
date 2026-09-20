# Despliegue con Dokploy (GHCR + webhook)

El build corre en GitHub Actions. Dokploy solo hace pull de la imagen y
redeploy cuando recibe el webhook. El VPS no construye.

Imagen: `ghcr.io/alvarordev/salud-map-demo`

El contenedor es nginx en el puerto **80**: SPA estático más reverse-proxy de
`/registro-renipress-webapp` hacia `https://app20.susalud.gob.pe:8086` (iframe
RENIPRESS). Traefik solo termina TLS del dominio de la app; no hace falta un
router aparte hacia SUSALUD. No hay API, Postgres ni volúmenes. No unir a
`dokploy-network`.

## Ramas y tags

| Rama | Entorno | Tags publicados | Imagen en Dokploy |
| ---- | ------- | --------------- | ----------------- |
| `develop` | staging | `dev-<sha>`, `dev-latest` | `ghcr.io/alvarordev/salud-map-demo:dev-latest` |
| `main` | production | `prod-<sha>`, `prod-latest` | `ghcr.io/alvarordev/salud-map-demo:prod-latest` |

El workflow de producción usa el GitHub Environment `production` (aprobación
manual opcional).

Healthcheck: `GET /health` → `ok`.

## Secrets de GitHub

- `DOKPLOY_WEBHOOK_STAGING`
- `DOKPLOY_WEBHOOK_PRODUCTION`

`GITHUB_TOKEN` publica en GHCR con `permissions: packages: write`. No hace
falta un PAT solo para push.

Si el paquete GHCR es privado, configura credenciales de lectura del registry
en Dokploy (no en este repo). No hay variables `VITE_*`.

## Checklist Dokploy (solo el usuario)

El agente no ejecuta `ssh vps` ni la UI de Dokploy.

### A. GitHub (una vez)

1. Tras el primer push, comprobar que Actions publica en GHCR.
2. Settings → Secrets and variables → Actions:
   - `DOKPLOY_WEBHOOK_STAGING`
   - `DOKPLOY_WEBHOOK_PRODUCTION`
3. Settings → Environments → crear `production` (reviewers opcionales).
4. Si el paquete es privado, dar `read` al token que use Dokploy.

### B. Registry en Dokploy (si GHCR es privado)

1. Dokploy → Registry → GitHub / GHCR.
2. Usuario que publica (`alvarordev`).
3. Token con `read:packages`.
4. Test connection.

### C. Apps Docker (no build en el VPS)

**Staging:** New Application → imagen Docker (no Git / Nixpacks).

- Nombre: `salud-map-demo-staging`
- Image: `ghcr.io/alvarordev/salud-map-demo`
- Tag: `dev-latest`
- Registry: GHCR si es privado
- Puerto del contenedor: **80**
- Sin `dokploy-network`, sin env de runtime

**Production:** `salud-map-demo-prod`, tag `prod-latest`.

El primer pull falla hasta que Actions haya publicado el tag (`develop` /
`main`).

### D. Dominio + SSL (Traefik)

En cada app → Domains:

1. Hostname (ej. staging y prod).
2. Path `/` (RENIPRESS va al mismo contenedor).
3. HTTPS / Let’s Encrypt como en el resto de apps.
4. No crear un dominio o router hacia `app20.susalud.gob.pe`.
5. DNS A o CNAME al VPS.

### E. Webhook

En cada app, copiar la URL de redeploy a
`DOKPLOY_WEBHOOK_STAGING` o `DOKPLOY_WEBHOOK_PRODUCTION`. No commitearla.

### F. Smoke

1. `https://<dominio>/health` → `ok`.
2. Mapa, departamento, pin, ficha.
3. Tab RENIPRESS: el iframe debe cargar. Si no: 502 = nginx no llega a
   SUSALUD; 404 = location mal; iframe vacío con cabeceras de frame =
   `proxy_hide_header` no aplicó.
4. “Abrir ficha oficial” abre SUSALUD en otra pestaña.

## Flujo

1. Push a `develop` → `dev-*` → webhook staging.
2. Validar staging → merge a `main`.
3. Push a `main` → `prod-*` → (aprobación environment) → webhook production.
