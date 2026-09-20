# Despliegue con Dokploy (GHCR + webhook)

El build corre en GitHub Actions. Dokploy solo hace pull de la imagen y
redeploy cuando recibe el webhook. El VPS no construye.

Hay **un solo entorno**: push a `main` → imagen `prod-*` → una app Dokploy.

Imagen: `ghcr.io/alvarordev/salud-map-demo`

El contenedor es nginx en el puerto **80**: SPA estático más reverse-proxy de
`/registro-renipress-webapp` hacia `https://app20.susalud.gob.pe:8086` (iframe
RENIPRESS). Traefik solo termina TLS del dominio de la app; no hace falta un
router aparte hacia SUSALUD. No hay API, Postgres ni volúmenes. No unir a
`dokploy-network`.

El repo es **público**. Si el paquete GHCR también es público, Dokploy no
necesita credenciales del registry.

## Rama y tags

| Rama | Tags publicados | Imagen en Dokploy |
| ---- | --------------- | ----------------- |
| `main` | `prod-<sha>`, `prod-latest` | `ghcr.io/alvarordev/salud-map-demo:prod-latest` |

El workflow usa el GitHub Environment `production` (un solo environment;
aprobación manual opcional).

Healthcheck: `GET /health` → `ok`.

## Secrets de GitHub

- `DOKPLOY_WEBHOOK_PRODUCTION`

`GITHUB_TOKEN` publica en GHCR con `permissions: packages: write`. No hace
falta un PAT solo para push. No hay variables `VITE_*`.

## Checklist Dokploy (solo el usuario)

El agente no ejecuta `ssh vps` ni la UI de Dokploy.

### A. GitHub (una vez)

1. Tras el push a `main`, comprobar que Actions publica en GHCR.
2. Settings → Environments → crear `production` si no existe.
3. Settings → Secrets and variables → Actions (o en el environment
   `production`): `DOKPLOY_WEBHOOK_PRODUCTION`.
4. En el paquete GHCR, visibilidad pública (o `read` para Dokploy si lo
   dejas privado).

### B. Registry en Dokploy (solo si GHCR es privado)

1. Dokploy → Registry → GitHub / GHCR.
2. Usuario que publica (`alvarordev`).
3. Token con `read:packages`.
4. Test connection.

### C. Una app Docker (no build en el VPS)

New Application → imagen Docker (no Git / Nixpacks).

- Nombre: `salud-map-demo`
- Image: `ghcr.io/alvarordev/salud-map-demo`
- Tag: `prod-latest`
- Registry: solo si el paquete es privado
- Puerto del contenedor: **80**
- Sin `dokploy-network`, sin env de runtime

El primer pull falla hasta que Actions haya publicado `prod-latest`.

### D. Dominio + SSL (Traefik)

1. Hostname del mapa.
2. Path `/` (RENIPRESS va al mismo contenedor).
3. HTTPS / Let’s Encrypt como en el resto de apps.
4. No crear un dominio o router hacia `app20.susalud.gob.pe`.
5. DNS A o CNAME al VPS.

### E. Webhook

Copiar la URL de redeploy de la app a `DOKPLOY_WEBHOOK_PRODUCTION`. No
commitearla.

### F. Smoke

1. `https://<dominio>/health` → `ok`.
2. Mapa, departamento, pin, ficha.
3. Tab RENIPRESS: el iframe debe cargar. Si no: 502 = nginx no llega a
   SUSALUD; 404 = location mal; iframe vacío con cabeceras de frame =
   `proxy_hide_header` no aplicó.
4. “Abrir ficha oficial” abre SUSALUD en otra pestaña.

## Flujo

Push a `main` → `prod-*` → (aprobación del environment si la activaste) →
webhook Dokploy.
