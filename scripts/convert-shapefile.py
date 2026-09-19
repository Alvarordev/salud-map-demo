#!/usr/bin/env python3
"""Convert CENEPRED shapefile + INEI departamentos GeoJSON into public/data."""

from __future__ import annotations

import json
import struct
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = Path(
    "/home/hazard/code/Establecimientos de Salud CENEPRED SuyoPomalia geogpsperu _"
)
STEM = "Establecimientos de Salud CENEPRED SuyoPomalia geogpsperu"
DEP_URL = (
    "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/"
    "peru_departamental_simple.geojson"
)
OUT_DIR = ROOT / "public" / "data"
POINTS_DIR = OUT_DIR / "establecimientos"
KEEP = {
    "objectid",
    "nombre_del",
    "departamen",
    "provincia",
    "distrito",
    "institucio",
    "codigo_min",
    "direccion",
    "disa___dir",
    "red",
    "microrred",
    "categoria_",
    "estabcondi",
    "fechaupdat",
    "fuente_des",
    "url_renipr",
}
FIELD_MAP = {
    "objectid": "objectid",
    "nombre_del": "nombre",
    "departamen": "departamento",
    "provincia": "provincia",
    "distrito": "distrito",
    "institucio": "institucion",
    "codigo_min": "codigoMinsa",
    "direccion": "direccion",
    "disa___dir": "disa",
    "red": "red",
    "microrred": "microrred",
    "categoria_": "categoria",
    "estabcondi": "condicion",
    "fechaupdat": "actualizado",
    "fuente_des": "fuente",
    "url_renipr": "urlRenipr",
}


def decode_dbf_bytes(raw: bytes) -> str:
    text = raw.split(b"\x00", 1)[0].strip()
    if not text:
        return ""
    try:
        return text.decode("utf-8")
    except UnicodeDecodeError:
        return text.decode("cp1252", errors="replace")


def slug(name: str) -> str:
    return name.strip().upper().replace(" ", "_") or "SIN_UBIGEO"


def parse_dbf(path: Path) -> tuple[list[str], list[dict]]:
    with path.open("rb") as f:
        header = f.read(32)
        nrecords = struct.unpack("<I", header[4:8])[0]
        header_len = struct.unpack("<H", header[8:10])[0]
        rec_len = struct.unpack("<H", header[10:12])[0]
        fields: list[tuple[str, str, int]] = []
        while True:
            desc = f.read(32)
            if desc[0] == 0x0D:
                break
            name = desc[0:11].split(b"\x00", 1)[0].decode("latin1")
            typ = chr(desc[11])
            length = desc[16]
            fields.append((name, typ, length))
        f.seek(header_len)
        rows: list[dict] = []
        for _ in range(nrecords):
            rec = f.read(rec_len)
            pos = 1
            row: dict = {}
            for name, typ, length in fields:
                raw = rec[pos : pos + length]
                pos += length
                if name not in KEEP:
                    continue
                key = FIELD_MAP[name]
                text = decode_dbf_bytes(raw)
                if typ == "N" and text:
                    try:
                        row[key] = int(text) if "." not in text else int(float(text))
                    except ValueError:
                        row[key] = text
                else:
                    row[key] = " ".join(text.replace("\r", " ").replace("\n", " ").split())
            rows.append(row)
        return [name for name, _, _ in fields], rows


def parse_shp_points(path: Path) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    with path.open("rb") as f:
        f.seek(100)
        while True:
            header = f.read(8)
            if len(header) < 8:
                break
            _rec_num, content_words = struct.unpack(">2i", header)
            content = f.read(content_words * 2)
            if len(content) < 20:
                continue
            shape_type = struct.unpack("<i", content[0:4])[0]
            if shape_type != 1:
                continue
            x, y = struct.unpack("<2d", content[4:20])
            points.append((x, y))
    return points


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    POINTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading departamentos…")
    with urllib.request.urlopen(DEP_URL, timeout=60) as resp:
        departamentos = json.loads(resp.read().decode("utf-8"))

    shp = SRC_DIR / f"{STEM}.shp"
    dbf = SRC_DIR / f"{STEM}.dbf"
    _, rows = parse_dbf(dbf)
    coords = parse_shp_points(shp)
    if len(rows) != len(coords):
        raise SystemExit(f"Record mismatch: dbf={len(rows)} shp={len(coords)}")

    grouped: dict[str, list[dict]] = defaultdict(list)
    for props, (x, y) in zip(rows, coords):
        dep = str(props.get("departamento") or "").strip().upper() or "SIN_UBIGEO"
        props["departamento"] = dep
        grouped[dep].append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [x, y]},
                "properties": props,
            }
        )

    counts = {dep: len(feats) for dep, feats in grouped.items()}
    for feat in departamentos.get("features", []):
        name = str(feat.get("properties", {}).get("NOMBDEP", "")).strip().upper()
        feat["properties"]["NOMBDEP"] = name
        feat["properties"]["count"] = counts.get(name, 0)

    (OUT_DIR / "departamentos.geojson").write_text(
        json.dumps(departamentos, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    index = []
    for dep, feats in sorted(grouped.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        filename = f"{slug(dep)}.geojson"
        collection = {"type": "FeatureCollection", "features": feats}
        (POINTS_DIR / filename).write_text(
            json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        index.append({"NOMBDEP": dep, "count": len(feats), "file": filename})

    (OUT_DIR / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(index)} department files, {len(rows)} points")


if __name__ == "__main__":
    main()
