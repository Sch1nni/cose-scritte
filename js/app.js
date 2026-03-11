/**
 * app.js — Logica della homepage di Cose scritte
 *
 * Responsabilità:
 *   - Carica stories/index.json e mostra la lista delle storie
 *   - Carica ogni storia in parallelo per calcolare il tempo di lettura
 *   - Legge i cookie per segnare le storie già lette
 *   - Mostra il pulsante "Riprendi" se l'utente si era fermato a metà
 *   - Mostra le barre tag se definite nel JSON della storia
 */

(function () {
  'use strict';

  const COOKIE_LETTE    = 'coseScritte_lette';
  const COOKIE_PROG_PRE = 'coseScritte_prog_';
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

  /* ── Tag HTML ───────────────────────────────────────────── */

  function renderTagHTML(tag) {
    if (!tag || tag.length === 0) return '';
    const items = tag.map(t => {
      const pct    = (Math.min(Math.max(Number(t.valore), 0), 10) / 10 * 100).toFixed(1);
      const colore = t.colore || TAG_COLORE_DEFAULT;
      return `
        <span class="tag-item">
          <span class="tag-nome">${t.nome}</span>
          <span class="tag-barra-sfondo"
                role="meter"
                aria-valuenow="${t.valore}"
                aria-valuemin="0"
                aria-valuemax="10"
                aria-label="${t.nome}: ${t.valore} su 10">
            <span class="tag-barra-riempimento"
                  style="width:${pct}%;background-color:${colore}">
            </span>
          </span>
          <span class="tag-valore">${t.valore}</span>
        </span>`;
    }).join('');
    return `<div class="storia-tag">${items}</div>`;
  }

  /* ── Fetch parallelo delle storie ───────────────────────── */

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
        const datiCompleti = ris.value;
        return {
          ...storia,
          tempo_lettura: calcolaTempoLettura(datiCompleti.contenuto),
          tag: datiCompleti.tag || [],
        };
      } else {
        return { ...storia, tempo_lettura: null, tag: [] };
      }
    });
  }

  /* ── Rendering ──────────────────────────────────────────── */

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
          ${tempoLabel ? `<span aria-hidden="true">·</span><span>${tempoLabel}</span>` : ''}
          ${letta ? '<span class="storia-letta-badge" title="Già letta">✓ letta</span>' : ''}
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

      // Mostra subito la lista (senza tempi), poi aggiorna con i dati completi
      renderStorie(dati.storie);

      const storieArricchite = await arricchisciStorie(dati.storie);
      renderStorie(storieArricchite);

    } catch (err) {
      console.error('Errore nel caricamento dell\'indice:', err);
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
