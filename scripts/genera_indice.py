"""
genera_indice.py
Legge tutti i file .json in stories/ (escluso index.json)
e riscrive stories/index.json con i metadati di ogni storia.
Le storie vengono ordinate per data, dalla più recente alla più vecchia.

Campi letti da ogni storia:
  - id       (obbligatorio — deve corrispondere al nome del file)
  - titolo   (obbligatorio)
  - data     (obbligatorio — formato YYYY-MM-DD)
  - estratto (obbligatorio)
  - tag      (opzionale — array di { nome, valore, colore? })

Nota: tempo_lettura NON viene scritto nell'indice —
viene calcolato dinamicamente da app.js e reader.js.
"""

import json
import pathlib
import sys

CARTELLA_STORIE = pathlib.Path("stories")
FILE_INDICE     = CARTELLA_STORIE / "index.json"

CAMPI_OBBLIGATORI = {"id", "titolo", "data", "estratto"}


def leggi_storie():
    storie = []
    errori = []

    for file in sorted(CARTELLA_STORIE.glob("*.json")):
        if file.name == "index.json":
            continue

        try:
            dati = json.loads(file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            errori.append(f"  ✗ {file.name}: JSON non valido — {e}")
            continue

        # Controlla i campi obbligatori
        mancanti = CAMPI_OBBLIGATORI - dati.keys()
        if mancanti:
            errori.append(f"  ✗ {file.name}: campi mancanti — {', '.join(sorted(mancanti))}")
            continue

        # Verifica che l'id corrisponda al nome del file
        id_atteso = file.stem
        if dati["id"] != id_atteso:
            print(f"  ⚠ {file.name}: il campo 'id' è '{dati['id']}' "
                  f"ma il file si chiama '{id_atteso}'. Uso il nome del file.")
            dati["id"] = id_atteso

        # Costruisce la voce per l'indice (solo i campi necessari)
        voce = {
            "id":       dati["id"],
            "titolo":   dati["titolo"],
            "data":     dati["data"],
            "estratto": dati["estratto"],
        }
        # Includi i tag solo se presenti e non vuoti
        if dati.get("tag"):
            voce["tag"] = dati["tag"]

        storie.append(voce)

    return storie, errori


def main():
    print(f"📂 Scansione di '{CARTELLA_STORIE}/'...")

    if not CARTELLA_STORIE.is_dir():
        print(f"Errore: la cartella '{CARTELLA_STORIE}' non esiste.")
        sys.exit(1)

    storie, errori = leggi_storie()

    if errori:
        print("Attenzione — alcune storie hanno avuto problemi:")
        for e in errori:
            print(e)

    # Ordina per data discendente (più recente prima)
    storie.sort(key=lambda s: s["data"], reverse=True)

    indice = {"storie": storie}
    FILE_INDICE.write_text(
        json.dumps(indice, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    print(f"✓ stories/index.json aggiornato con {len(storie)} "
          f"{'storia' if len(storie) == 1 else 'storie'}.")
    for s in storie:
        tag_info = f" ({len(s['tag'])} tag)" if s.get("tag") else ""
        print(f"  · [{s['data']}] {s['titolo']}{tag_info}")


if __name__ == "__main__":
    main()