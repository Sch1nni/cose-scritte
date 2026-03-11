# Cose scritte — Documentazione tecnica

La documentazione (e anche tutta la stack, in realtà) è stata scritta da un LLM; pur non essendo il sito il focus di questo progetto privato, ci tengo a recuperare un po' di dignità sostituendo l'introduzione senz'anima con questo bel commentario. Nessuna delle storie che ho pubblicato o pubblicherò toccheranno mai un LLM, neanche con un bastone lungo un metro. Per tale ragione, apprezzate ogni singolo errore di battitura e similari.

---

## Struttura del progetto

```
cose-scritte/
├── index.html                  # Homepage: lista delle storie
├── storia.html                 # Pagina lettore: mostra una singola storia
├── css/
│   └── style.css               # Tutti gli stili (temi, layout, reader, animazioni)
├── js/
│   ├── app.js                  # Logica homepage (carica index.json, mostra lista)
│   └── reader.js               # Logica lettore (temi, font, modalità, cookie)
├── stories/
│   ├── index.json              # Indice di tutte le storie pubblicate
│   └── la-prima-storia.json    # Una storia = un file JSON
├── app.py                      # Server Flask (solo per PythonAnywhere)
├── requirements.txt            # Dipendenze Python
└── README.md                   # Questo file
```

---

## Come aggiungere una storia

### 1. Crea il file della storia

Crea `stories/nome-della-storia.json`:

```json
{
  "id": "nome-della-storia",
  "titolo": "Il titolo della storia",
  "data": "2024-06-01",
  "estratto": "Due o tre righe che appaiono nella lista — invoglia il lettore.",
  "tempo_lettura": 5,
  "contenuto": [
    "Primo paragrafo della storia. Può contenere <em>corsivo</em> e <strong>grassetto</strong>.",
    "Secondo paragrafo.",
    "Ogni stringa dell'array diventa un paragrafo HTML separato."
  ]
}
```

**Regole per l'id:** solo lettere minuscole, cifre e trattini. Deve corrispondere al nome del file.

**tempo_lettura:** stima in minuti interi (circa 200 parole al minuto).

**contenuto:** array di stringhe. Ogni stringa è un paragrafo. Supporta HTML inline:
- `<em>testo</em>` → corsivo
- `<strong>testo</strong>` → grassetto
- `<br>` → a capo nel paragrafo
- Non usare blocchi HTML complessi (div, h2, ecc.) — potrebbero rompere il layout.

### 2. Aggiungi la storia all'indice

Apri `stories/index.json` e aggiungi un oggetto all'array `storie`:

```json
{
  "storie": [
    {
      "id": "nome-della-storia",
      "titolo": "Il titolo della storia",
      "data": "2024-06-01",
      "estratto": "Due o tre righe che appaiono nella lista.",
      "tempo_lettura": 5
    },
    {
      "id": "la-prima-storia",
      ...
    }
  ]
}
```

L'ordine nell'array è l'ordine di visualizzazione in homepage. Metti le storie più recenti in cima.

---

## Sistema di cookie

Tutti i cookie usano il prefisso `coseScritte_` e scadono dopo 365 giorni.

| Cookie | Valore | Scopo |
|--------|--------|-------|
| `coseScritte_lette` | JSON array di id (`["storia-1","storia-2"]`) | Storie segnate come lette (badge ✓ nella lista) |
| `coseScritte_prog_[id]` | Numero float 0.0–1.0 | Progresso di lettura per quella storia (0 = inizio, 1 = fine) |
| `coseScritte_impostazioni` | JSON oggetto | Preferenze del lettore (tema, dimensione, modalità, barra) |

**Logica "letta":** la storia viene segnata come letta quando:
- In modalità Scorri: lo scroll supera il 97% della pagina
- In modalità Libro: l'utente raggiunge l'ultima pagina

**Logica "Riprendi":** il pulsante appare nella lista se il progresso salvato è tra 2% e 97% (non all'inizio, non alla fine).

---

## Impostazioni del lettore

Le impostazioni sono salvate nel cookie `coseScritte_impostazioni` e persistono tra sessioni.

### Tema (data-tema sull'elemento `<html>`)
- `chiaro` — sfondo pergamena calda (#F7EFE0), testo inchiostro scuro
- `scuro` — sfondo quasi nero (#1A0F07), testo crema
- `grigio` — sfondo grigio neutro (#F0F0EC), testo quasi nero

### Dimensione testo (data-dimensione sull'elemento `<html>`)
Sovrascrive la variabile CSS `--font-size`:
- `piccolo` → 15px
- `medio` → 18px (default)
- `grande` → 20px
- `molto-grande` → 23px

### Modalità di lettura
- `scorri` (default) — pagina verticale continua, barra progresso basata sullo scroll
- `libro` — testo diviso in pagine da ~1800 caratteri, navigazione con pulsanti/tastiera/swipe

### Barra di avanzamento
Toggle on/off. Quando attiva, mostra una barra colorata a 3px sopra la pagina.

---

## Deployment

### Opzione A — GitHub Pages (statico, gratuito)

Ideale se non serve backend Python. Nessuna modifica al codice necessaria.

1. Crea un nuovo account GitHub (separato dal tuo account principale se vuoi l'anonimato)
2. Crea un repository pubblico chiamato `username.github.io`
3. Carica **tutti i file tranne `app.py` e `requirements.txt`** nella root del repository
4. Vai su Settings → Pages → Source: "Deploy from a branch" → branch `main`, cartella `/` (root)
5. Il sito sarà disponibile su `https://username.github.io`

**Nota:** GitHub Pages serve file statici. Il fetch di `stories/index.json` funziona perché è un semplice file nella stessa repository.

**Aggiungere una storia su GitHub Pages:**
1. Crea il file JSON localmente
2. Aggiungi la voce in `index.json`
3. Fai commit e push → GitHub Pages si aggiorna in pochi secondi

### Opzione B — PythonAnywhere (Flask, gratuito)

Necessario se vuoi avere un backend Python (es. per features future come commenti, autenticazione, ecc.).

1. Crea un account su pythonanywhere.com
2. Vai su "Files" e carica l'intera cartella del progetto in `/home/TUONOME/cose-scritte/`
3. Apri una console Bash e installa le dipendenze:
   ```bash
   cd ~/cose-scritte
   pip install --user -r requirements.txt
   ```
4. Vai su "Web" → "Add a new web app" → Manual configuration → Python 3.10
5. In "WSGI configuration file" (link in arancione nella pagina), sostituisci tutto il contenuto con:
   ```python
   import sys
   sys.path.insert(0, '/home/TUONOME/cose-scritte')
   from app import app as application
   ```
   (sostituisci `TUONOME` con il tuo username di PythonAnywhere)
6. Clicca "Reload" nella pagina Web

**Aggiungere una storia su PythonAnywhere:**
1. Vai su "Files" nel pannello PythonAnywhere
2. Naviga in `/home/TUONOME/cose-scritte/stories/`
3. Carica il nuovo file JSON della storia
4. Modifica `index.json` per aggiungere la voce
5. Nessun restart necessario — Flask serve i file statici direttamente

### Sviluppo locale (entrambe le opzioni)

```bash
cd cose-scritte
pip install flask
python app.py
# oppure: flask run
```

Apri `http://localhost:5000`

**Nota:** `index.html` non funziona se aperto direttamente come file (protocollo `file://`) perché il browser blocca le richieste fetch per ragioni di sicurezza. Usa sempre un server locale.

---

## Architettura CSS

Il CSS usa variabili custom per tutti i valori dipendenti dal tema:

```css
:root { /* tema chiaro, valori default */ }
[data-tema="scuro"]  { /* sovrascritture tema scuro */ }
[data-tema="grigio"] { /* sovrascritture tema grigio */ }
[data-dimensione="piccolo"] { --font-size: 15px; }
/* ecc. */
```

I font sono caricati da Google Fonts:
- **Playfair Display** — titoli, intestazioni, etichette
- **Lora** — corpo del testo

La texture della carta è un SVG inline generato con `feTurbulence`, applicato come `body::after` con opacity molto bassa.

---

## Architettura JavaScript

Entrambi i file JS usano una IIFE `(function() { 'use strict'; ... })()` per evitare variabili globali.

### app.js

| Funzione | Scopo |
|----------|-------|
| `getCookie(name)` | Legge un cookie |
| `getStorieLetteSet()` | Restituisce un Set con gli id delle storie lette |
| `getProgresso(id)` | Restituisce il progresso salvato (0–1) o null |
| `formattaData(iso)` | Formatta "YYYY-MM-DD" in "15 marzo 2024" |
| `renderStorie(storie)` | Crea e inserisce nel DOM la lista delle storie |
| `inizializza()` | Entry point: fetch di index.json → renderStorie |

### reader.js

| Funzione | Scopo |
|----------|-------|
| `setCookie / getCookie` | Gestione cookie |
| `salvaProgresso / getProgresso` | Salva/legge il progresso per una storia |
| `segnaComeLetta` | Aggiunge l'id all'array delle storie lette |
| `salvaImpostazioni / caricaImpostazioni` | Persiste le preferenze del lettore |
| `applicaTema(tema)` | Cambia `data-tema` sull'html, aggiorna pulsanti |
| `applicaDimensione()` | Cambia `data-dimensione` sull'html |
| `aggiornaVisibilitaBarra()` | Mostra/nasconde la barra di avanzamento |
| `onScroll()` | Calcola progresso scroll, salva, segna come letta se > 97% |
| `costruisciPagine()` | Raggruppa i `<p>` in pagine da ~1800 caratteri |
| `mostraPagina(indice)` | Mostra/nasconde i `<p>` per la pagina corrente |
| `applicaModalita(modalita)` | Attiva Scorri o Libro |
| `apriPannello / chiudiPannello` | Gestisce il pannello impostazioni laterale |
| `caricaStoria()` | Fetch del JSON, popola il DOM, gestisce "riprendi" |
| `inizializza()` | Entry point: carica impostazioni → carica storia → event listeners |

---

## Estensioni future suggerite

- **Ricerca full-text** — JavaScript client-side su `stories/index.json` (nessun backend necessario)
- **Tag / categorie** — aggiungere campo `"tag": ["racconto", "breve"]` ai JSON
- **Nota dell'autore** — campo `"nota": "..."` mostrato dopo il testo
- **Ordine personalizzato** — campo `"ordine": 1` in index.json
- **Feed RSS** — generabile staticamente con uno script Python che legge i JSON
- **Dark mode automatica** — rilevare `prefers-color-scheme` come default prima dei cookie

---

*Documentazione aggiornata alla versione iniziale del progetto.*
