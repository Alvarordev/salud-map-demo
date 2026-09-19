# Establecimientos de salud

Demo de mapa: Perú por departamentos, zoom a los centros de un departamento, ficha a la derecha y pestaña RENIPRESS.

## Requisitos

- Node 20+
- Python 3 (solo para regenerar datos)

## Datos

Los GeoJSON viven en `public/data`. Para regenerarlos desde el shapefile de CENEPRED:

```bash
npm run data
```

Fuente de polígonos: [juaneladio/peru-geojson](https://github.com/juaneladio/peru-geojson) (`peru_departamental_simple.geojson`).

## Desarrollo

```bash
npm install
npm run dev
```

El proxy de Vite reenvía `/registro-renipress-webapp` a `https://app20.susalud.gob.pe:8086` para poder mostrar la ficha en un iframe en localhost. Es solo para la demo local: no lo uses en producción. Si el marco queda vacío, el panel incluye **Abrir ficha oficial**.

El mapa usa teselas de OpenStreetMap. Elige un departamento en el mapa o en la lista; los puntos y el listado de centros aparecen al entrar.
