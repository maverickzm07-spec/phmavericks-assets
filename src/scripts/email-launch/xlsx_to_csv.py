"""
Conversor de Excel (.xlsx) a correos.csv
Uso:
    python xlsx_to_csv.py ruta/al/archivo.xlsx
    python xlsx_to_csv.py ruta/al/archivo.xlsx --col-nombre name --col-email email
"""

import sys
import csv
import re
import argparse
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    with zf.open("xl/sharedStrings.xml") as f:
        tree = ET.parse(f)
    root = tree.getroot()
    strings = []
    for si in root.findall(f"{{{NS}}}si"):
        t = si.find(f"{{{NS}}}t")
        if t is not None:
            strings.append(t.text or "")
        else:
            parts = [r.find(f"{{{NS}}}t") for r in si.findall(f"{{{NS}}}r")]
            strings.append("".join((p.text or "") for p in parts if p is not None))
    return strings


def parse_sheet(zf: zipfile.ZipFile, shared: list[str]) -> list[list[str]]:
    with zf.open("xl/worksheets/sheet1.xml") as f:
        tree = ET.parse(f)
    root = tree.getroot()
    sheet_data = root.find(f"{{{NS}}}sheetData")
    rows = []
    for row_el in sheet_data.findall(f"{{{NS}}}row"):
        row = []
        for cell in row_el.findall(f"{{{NS}}}c"):
            v = cell.find(f"{{{NS}}}v")
            if v is None:
                row.append("")
                continue
            if cell.get("t") == "s":
                row.append(shared[int(v.text)])
            else:
                row.append(v.text or "")
        rows.append(row)
    return rows


def col_index(header_row: list[str], col_name: str) -> int:
    name_lower = col_name.lower()
    for i, h in enumerate(header_row):
        if h.strip().lower() == name_lower:
            return i
    return -1


def convert(xlsx_path: Path, col_nombre: str, col_email: str, out_path: Path):
    with zipfile.ZipFile(xlsx_path, "r") as zf:
        shared = parse_shared_strings(zf)
        rows   = parse_sheet(zf, shared)

    if not rows:
        print("[ERROR] El archivo Excel está vacío.")
        sys.exit(1)

    headers   = rows[0]
    idx_email  = col_index(headers, col_email)
    idx_nombre = col_index(headers, col_nombre)

    if idx_email == -1:
        print(f"[ERROR] No se encontró la columna '{col_email}'.")
        print(f"  Columnas disponibles: {headers}")
        sys.exit(1)

    seen    = set()
    written = 0
    skipped = 0

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["nombre", "email"])

        for row in rows[1:]:
            email  = row[idx_email].strip().lower()  if idx_email < len(row)  else ""
            nombre = row[idx_nombre].strip()          if idx_nombre != -1 and idx_nombre < len(row) else ""

            if not email:
                skipped += 1
                continue
            if not EMAIL_REGEX.match(email):
                print(f"  [SKIP] Email inválido: {email}")
                skipped += 1
                continue
            if email in seen:
                print(f"  [SKIP] Duplicado: {email}")
                skipped += 1
                continue

            seen.add(email)
            writer.writerow([nombre, email])
            written += 1

    print(f"\n  Guardado en: {out_path}")
    print(f"  Contactos escritos : {written}")
    print(f"  Filas omitidas      : {skipped}")


def main():
    parser = argparse.ArgumentParser(description="Convierte un .xlsx a correos.csv")
    parser.add_argument("xlsx", help="Ruta al archivo Excel (.xlsx)")
    parser.add_argument("--col-nombre", default="name",  help="Nombre de la columna con el nombre (default: name)")
    parser.add_argument("--col-email",  default="email", help="Nombre de la columna con el email (default: email)")
    parser.add_argument("--out",        default=None,    help="Ruta de salida del CSV (default: correos.csv junto al script)")
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx)
    if not xlsx_path.exists():
        print(f"[ERROR] No se encontró el archivo: {xlsx_path}")
        sys.exit(1)

    out_path = Path(args.out) if args.out else Path(__file__).parent / "correos.csv"

    print(f"\n  Leyendo: {xlsx_path}")
    convert(xlsx_path, args.col_nombre, args.col_email, out_path)


if __name__ == "__main__":
    main()
