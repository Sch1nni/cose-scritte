/**
 * app.js — Logica della homepage di Cose scritte
 *
 * Responsabilità:
 *   - Carica stories/index.json e mostra la lista delle storie
 *   - Legge i cookie per segnare le storie già lette
 *   - Mostra il pulsante "Riprendi" se l'utente si era fermato a metà
 */

(function () {
  'use strict';

  const COOKIE_LETTE    = 'coseScritte_lette';
  const COOKIE_PROG_PRE = 'coseScritte_prog_';

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
    // iso = "YYYY-MM-DD"
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('it-IT', {
      day: 'numeric', month: 'long', year: 'numeric'
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
      const letta      = lette.has(storia.id);
      const progresso  = getProgresso(storia.id);
      // "Riprendi" solo se c'è un progresso salvato tra 2% e 97%
      const hasRiprendi = progresso !== null && progresso > 0.02 && progresso < 0.97;

      const li = document.createElement('li');
      li.className = 'storia-anteprima';
      li.style.animationDelay = `${i * 0.06}s`;

      li.innerHTML = `
        <div class="storia-meta">
          <span>${formattaData(storia.data)}</span>
          <span aria-hidden="true">·</span>
          <span>${storia.tempo_lettura}&nbsp;min di lettura</span>
          ${letta ? '<span class="storia-letta-badge" title="Già letta">✓ letta</span>' : ''}
        </div>

        <a class="storia-titolo-link" href="storia.html?id=${encodeURIComponent(storia.id)}">
          <h2>${storia.titolo}</h2>
        </a>

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
      renderStorie(dati.storie);
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
