/**
 * app.js — Logica della homepage di Cose scritte
 *
 * Responsabilità:
 *   - Carica stories/index.json e mostra la lista delle storie
 *   - Carica ogni storia in parallelo per calcolare il tempo di lettura
 *   - Legge i cookie per segnare le storie già lette
 *   - Mostra il pulsante "Riprendi" se l'utente si era fermato a metà
 *   - Mostra i tag con stelle di valutazione (0–10 → 0–5 stelle, mezze stelle incluse)
 */

(function () {
  'use strict';

  const COOKIE_LETTE       = 'coseScritte_lette';
  const COOKIE_PROG_PRE    = 'coseScritte_prog_';
  const TAG_COLORE_DEFAULT = '#9B6555'; // terracotta caldo

  /* ── Cookie helpers ─────────────────────────────────────── */

  function getCookie(name) {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
    );
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getStorieLetteSet() {
    const v = getCookie(COOKIE_LETTE);
    if (!v) return new Set();
    try { return new Set(JSON.parse(v)); } catch { return new Set(); }
  }

  function getProgresso(id) {
    const v = getCookie(COOKIE_PROG_PRE + id);
    return v !== null ? parseFloat(v) : null;
  }

  /* ── Formattazione data ─────────────────────────────────── */

  function formattaData(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /* ── Tempo di lettura ───────────────────────────────────── */

  function calcolaTempoLettura(contenuto) {
    if (!Array.isArray(contenuto) || contenuto.length === 0) return 1;
    const parole = contenuto.join(' ').trim().split(/\s+/).length;
    return Math.max(1, Math.round(parole / 200));
  }

  /* ── Tag: validazione ───────────────────────────────────── */

  /**
   * Restituisce il valore intero se valido (intero, 0–10), altrimenti null.
   * Valori non interi, NaN, fuori range → non mostrare il tag.
   */
  function validaValore(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    if (Math.floor(n) !== n) return null; // non intero
    if (n < 0 || n > 10)    return null; // fuori range
    return n;
  }

  /* ── Tag: stelle ────────────────────────────────────────── */

  /**
   * Genera 5 posizioni stella.
   * valore 0–10 → stelle 0–5, passo 0.5 (es. 7 → 3.5 stelle).
   * Ogni posizione: stella di sfondo + stella colorata clippata.
   */
  function renderStelle(valore, colore) {
    const stelle = valore / 2; // 0–5, step 0.5
    let html = '';
    for (let i = 1; i <= 5; i++) {
      let tipo;
      if (stelle >= i)           tipo = 'piena';
      else if (stelle >= i - 0.5) tipo = 'meta';
      else                        tipo = 'vuota';
      html += `<span class="stella-pos">` +
                `<span class="stella-fondo">★</span>` +
                `<span class="stella-fill ${tipo}" style="color:${colore}">★</span>` +
              `</span>`;
    }
    return html;
  }

  /* ── Tag: rendering completo ────────────────────────────── */

  function renderTagHTML(tag) {
    if (!tag || tag.length === 0) return '';

    const righe = tag
      .map(t => {
        const valore = validaValore(t.valore);
        if (valore === null) return null; // tag non valido, salta

        const colore  = t.colore || TAG_COLORE_DEFAULT;
        const stelle  = valore / 2;
        const ariaLabel = `${t.nome}: ${valore} su 10 (${stelle} stelle su 5)`;

        return `<div class="tag-riga">` +
                 `<span class="tag-nome">${t.nome}</span>` +
                 `<span class="tag-stelle" role="meter" ` +
                       `aria-valuenow="${valore}" aria-valuemin="0" aria-valuemax="10" ` +
                       `aria-label="${ariaLabel}">` +
                   renderStelle(valore, colore) +
                 `</span>` +
                 `<span class="tag-valore">${valore}/10</span>` +
               `</div>`;
      })
      .filter(Boolean) // rimuovi i tag non validi
      .join('');

    return righe ? `<div class="storia-tag">${righe}</div>` : '';
  }

  /* ── Fetch parallelo delle storie ───────────────────────── */

  /**
   * Carica ogni storia in parallelo per recuperare:
   *   - tempo di lettura (calcolato dal contenuto)
   *   - tag (opzionali)
   * Promise.allSettled garantisce che una storia rotta non blocchi le altre.
   */
  async function arricchisciStorie(storie) {
    const risultati = await Promise.allSettled(
      storie.map(s =>
        fetch(`stories/${encodeURIComponent(s.id)}.json`)
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
      )
    );

    return storie.map((storia, i) => {
      const ris = risultati[i];
      if (ris.status === 'fulfilled') {
        const dati = ris.value;
        return {
          ...storia,
          tempo_lettura: calcolaTempoLettura(dati.contenuto),
          tag: dati.tag || [],
        };
      }
      // Storia non caricabile: mostrala lo stesso senza tempo/tag
      return { ...storia, tempo_lettura: null, tag: [] };
    });
  }

  /* ── Rendering lista storie ─────────────────────────────── */

  function renderStorie(storie) {
    const contenitore = document.getElementById('lista-storie-contenitore');
    const lette       = getStorieLetteSet();

    if (!storie || storie.length === 0) {
      contenitore.innerHTML = '<p class="nessuna-storia">Nessuna storia pubblicata per ora.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'lista-storie';
    ul.setAttribute('role', 'list');

    storie.forEach((storia, i) => {
      const letta       = lette.has(storia.id);
      const progresso   = getProgresso(storia.id);
      const hasRiprendi = progresso !== null && progresso > 0.02 && progresso < 0.97;
      const tempoLabel  = storia.tempo_lettura
        ? `${storia.tempo_lettura}&nbsp;min di lettura`
        : '';

      const li = document.createElement('li');
      li.className = 'storia-anteprima';
      li.style.animationDelay = `${i * 0.06}s`;

      li.innerHTML = `
        <div class="storia-meta">
          <span>${formattaData(storia.data)}</span>
          ${tempoLabel
            ? `<span aria-hidden="true">·</span><span>${tempoLabel}</span>`
            : ''}
          ${letta
            ? '<span class="storia-letta-badge" title="Già letta">✓ letta</span>'
            : ''}
        </div>

        <a class="storia-titolo-link" href="storia.html?id=${encodeURIComponent(storia.id)}">
          <h2>${storia.titolo}</h2>
        </a>

        ${renderTagHTML(storia.tag)}

        <p class="storia-estratto">${storia.estratto}</p>

        <div class="storia-azioni">
          <a class="storia-link" href="storia.html?id=${encodeURIComponent(storia.id)}">
            Leggi →
          </a>
          ${hasRiprendi
            ? `<a class="bottone-riprendi"
                  href="storia.html?id=${encodeURIComponent(storia.id)}&riprendi=1"
                  title="Riprendi da dove ti sei fermato">
                  Riprendi
               </a>`
            : ''}
        </div>
      `;

      ul.appendChild(li);
    });

    contenitore.innerHTML = '';
    contenitore.appendChild(ul);
  }

  /* ── Inizializzazione ───────────────────────────────────── */

  async function inizializza() {
    try {
      const risposta = await fetch('stories/index.json');
      if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
      const dati = await risposta.json();

      // Primo render immediato (senza tempi né tag)
      renderStorie(dati.storie);

      // Secondo render con tempi e tag calcolati
      const storieArricchite = await arricchisciStorie(dati.storie);
      renderStorie(storieArricchite);

    } catch (err) {
      console.error("Errore nel caricamento dell'indice:", err);
      document.getElementById('lista-storie-contenitore').innerHTML =
        '<p class="nessuna-storia">Impossibile caricare le storie. Riprova più tardi.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializza);
  } else {
    inizializza();
  }

})();
