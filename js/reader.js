/**
 * reader.js — Logica del lettore di Cose scritte
 *
 * Funzionalità:
 *   - Carica la storia richiesta via ?id=nome-storia
 *   - Modalità Scorri (scroll) e Libro (paginato)
 *   - Temi: Chiaro / Scuro / Grigio
 *   - Dimensioni testo: Piccolo / Medio / Grande / Molto grande
 *   - Barra di avanzamento lettura (attivabile/disattivabile)
 *   - Cookie: salva il progresso di lettura e segna le storie lette
 *   - Navigazione ebook: click, tastiera, swipe touch
 */

(function () {
  'use strict';

  /* ── Costanti ───────────────────────────────────────────── */

  const COOKIE_LETTE       = 'coseScritte_lette';
  const COOKIE_PROG_PRE    = 'coseScritte_prog_';
  const COOKIE_IMPOSTAZIONI = 'coseScritte_impostazioni';
  const COOKIE_GIORNI      = 365;

  const DIMENSIONI = ['piccolo', 'medio', 'grande', 'molto-grande'];
  const NOMI_DIM   = ['Piccolo', 'Medio', 'Grande', 'Molto grande'];
  const CHARS_PER_PAGINA = 1800;

  /* ── Stato ──────────────────────────────────────────────── */

  let storyId         = null;
  let modalita        = 'scorri';
  let dimIndice       = 1;        // indice in DIMENSIONI
  let pagineEbook     = [];       // array di array di <p>
  let paginaCorrente  = 0;
  let touchStartX     = 0;

  /* ── Cookie helpers ─────────────────────────────────────── */

  function setCookie(name, value, days) {
    const exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie =
      `${name}=${encodeURIComponent(value)};expires=${exp};path=/;SameSite=Lax`;
  }

  function getCookie(name) {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
    );
    return m ? decodeURIComponent(m[1]) : null;
  }

  function salvaProgresso(id, valore) {
    setCookie(COOKIE_PROG_PRE + id, valore.toFixed(4), COOKIE_GIORNI);
  }

  function getProgresso(id) {
    const v = getCookie(COOKIE_PROG_PRE + id);
    return v !== null ? parseFloat(v) : null;
  }

  function segnaComeLetta(id) {
    let lette = [];
    try {
      const v = getCookie(COOKIE_LETTE);
      lette = v ? JSON.parse(v) : [];
    } catch { lette = []; }
    if (!lette.includes(id)) {
      lette.push(id);
      setCookie(COOKIE_LETTE, JSON.stringify(lette), COOKIE_GIORNI);
    }
  }

  /* ── Salva / carica impostazioni ────────────────────────── */

  function salvaImpostazioni() {
    const im = {
      tema:      document.documentElement.getAttribute('data-tema') || 'chiaro',
      dimensione: dimIndice,
      modalita,
      progresso: document.getElementById('toggleProgresso').checked,
    };
    setCookie(COOKIE_IMPOSTAZIONI, JSON.stringify(im), COOKIE_GIORNI);
  }

  function caricaImpostazioni() {
    try {
      const v = getCookie(COOKIE_IMPOSTAZIONI);
      if (!v) return;
      const im = JSON.parse(v);
      if (im.tema)                       applicaTema(im.tema, false);
      if (typeof im.dimensione === 'number') {
        dimIndice = Math.max(0, Math.min(im.dimensione, DIMENSIONI.length - 1));
        applicaDimensione(false);
      }
      if (im.modalita)                   modalita = im.modalita;
      if (typeof im.progresso === 'boolean') {
        document.getElementById('toggleProgresso').checked = im.progresso;
        aggiornaVisibilitaBarra();
      }
    } catch { /* ignora impostazioni corrotte */ }
  }

  /* ── Tema ───────────────────────────────────────────────── */

  function applicaTema(tema, salva = true) {
    document.documentElement.setAttribute('data-tema', tema);
    document.querySelectorAll('.btn-tema').forEach(btn => {
      btn.classList.toggle('attivo', btn.dataset.tema === tema);
    });
    if (salva) salvaImpostazioni();
  }

  /* ── Dimensione testo ───────────────────────────────────── */

  function applicaDimensione(salva = true) {
    document.documentElement.setAttribute('data-dimensione', DIMENSIONI[dimIndice]);
    document.getElementById('dimensioneCorrente').textContent = NOMI_DIM[dimIndice];
    if (salva) salvaImpostazioni();
  }

  /* ── Barra avanzamento ──────────────────────────────────── */

  function aggiornaVisibilitaBarra() {
    const mostra = document.getElementById('toggleProgresso').checked;
    document.getElementById('barraProgresso').classList.toggle('nascosta', !mostra);
  }

  function impostaProgressoBarra(val) {
    document.getElementById('barraProgressoInner').style.width = (val * 100) + '%';
  }

  /* ── Progresso scroll ───────────────────────────────────── */

  function onScroll() {
    if (modalita !== 'scorri') return;
    const scrollTop  = window.scrollY;
    const docAltezza = document.documentElement.scrollHeight - window.innerHeight;
    const perc       = docAltezza > 0 ? scrollTop / docAltezza : 0;
    impostaProgressoBarra(perc);
    if (storyId) {
      salvaProgresso(storyId, perc);
      if (perc > 0.97) segnaComeLetta(storyId);
    }
  }

  /* ── Paginazione ebook ──────────────────────────────────── */

  function costruisciPagine() {
    const contenitore = document.getElementById('testo-storia');
    const paragrafi   = Array.from(contenitore.querySelectorAll('p'));

    pagineEbook = [];
    let paginaAtt = [];
    let charCount = 0;

    paragrafi.forEach(p => {
      const len = p.textContent.length;
      if (charCount + len > CHARS_PER_PAGINA && paginaAtt.length > 0) {
        pagineEbook.push(paginaAtt);
        paginaAtt = [p];
        charCount = len;
      } else {
        paginaAtt.push(p);
        charCount += len;
      }
    });
    if (paginaAtt.length > 0) pagineEbook.push(paginaAtt);

    // Nascondi tutti i paragrafi; mostraPagina li rivelerà
    paragrafi.forEach(p => { p.style.display = 'none'; });
  }

  function mostraPagina(indice) {
    if (pagineEbook.length === 0) return;
    paginaCorrente = Math.max(0, Math.min(indice, pagineEbook.length - 1));

    // Nascondi tutto
    document.getElementById('testo-storia')
      .querySelectorAll('p')
      .forEach(p => { p.style.display = 'none'; });

    // Mostra la pagina corrente
    pagineEbook[paginaCorrente].forEach(p => { p.style.display = ''; });

    // Aggiorna UI navigazione
    const totale = pagineEbook.length;
    document.getElementById('infoPagina').textContent =
      `Pagina ${paginaCorrente + 1} di ${totale}`;
    document.getElementById('paginaPrecedente').disabled = paginaCorrente === 0;
    document.getElementById('paginaSuccessiva').disabled = paginaCorrente === totale - 1;

    // Progresso
    const perc = totale > 1 ? paginaCorrente / (totale - 1) : 1;
    impostaProgressoBarra(perc);
    if (storyId) {
      salvaProgresso(storyId, perc);
      if (paginaCorrente === totale - 1) segnaComeLetta(storyId);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Modalità di lettura ────────────────────────────────── */

  function applicaModalita(nuovaModalita, salva = true) {
    modalita = nuovaModalita;

    document.querySelectorAll('.btn-modalita').forEach(btn => {
      btn.classList.toggle('attivo', btn.dataset.modalita === nuovaModalita);
    });

    const navEbook  = document.getElementById('navigazioneEbook');
    const testoEl   = document.getElementById('testo-storia');

    if (nuovaModalita === 'libro') {
      document.body.classList.add('modalita-libro');
      navEbook.classList.remove('nascosta');
      costruisciPagine();
      mostraPagina(paginaCorrente);
    } else {
      // Torna alla modalità scroll
      document.body.classList.remove('modalita-libro');
      navEbook.classList.add('nascosta');
      testoEl.querySelectorAll('p').forEach(p => { p.style.display = ''; });
      impostaProgressoBarra(0);
      onScroll(); // ricalcola subito
    }

    if (salva) salvaImpostazioni();
  }

  /* ── Pannello impostazioni ──────────────────────────────── */

  function apriPannello() {
    document.getElementById('pannelloImpostazioni').classList.add('aperto');
    document.getElementById('overlay').classList.add('attivo');
  }

  function chiudiPannello() {
    document.getElementById('pannelloImpostazioni').classList.remove('aperto');
    document.getElementById('overlay').classList.remove('attivo');
  }

  /* ── Carica storia dal JSON ─────────────────────────────── */

  async function caricaStoria() {
    const params  = new URLSearchParams(window.location.search);
    storyId       = params.get('id');
    const riprendi = params.get('riprendi') === '1';

    if (!storyId) {
      document.getElementById('storia-titolo').textContent = 'Storia non trovata';
      return;
    }

    try {
      const risposta = await fetch(`stories/${encodeURIComponent(storyId)}.json`);
      if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
      const storia = await risposta.json();

      // Titolo della scheda del browser
      document.title = `${storia.titolo} — Cose scritte`;

      // Intestazione
      document.getElementById('storia-titolo').textContent = storia.titolo;

      const d = new Date(storia.data + 'T12:00:00');
      const dataFormattata = d.toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      const _parole = storia.contenuto.join(' ').trim().split(/\s+/).length;
      const _minuti = Math.max(1, Math.round(_parole / 200));
      document.getElementById('storia-meta').innerHTML = `
        <span>${dataFormattata}</span>
        <span aria-hidden="true">·</span>
        <span>${_minuti}&nbsp;min di lettura</span>
      `;

      // Testo: ogni elemento dell'array diventa un <p>
      const contenitore = document.getElementById('testo-storia');
      contenitore.innerHTML = '';
      storia.contenuto.forEach(testo => {
        const p = document.createElement('p');
        p.innerHTML = testo; // supporta <em>, <strong>, <br>, ecc.
        contenitore.appendChild(p);
      });

      // Applica la modalità salvata (costruisce le pagine se "libro")
      applicaModalita(modalita, false);

      // Riprendi la lettura
      if (riprendi) {
        const prog = getProgresso(storyId);
        if (prog !== null && prog > 0.01) {
          if (modalita === 'scorri') {
            // Scorri fino alla posizione salvata dopo che la pagina ha finito di caricarsi
            requestAnimationFrame(() => {
              const docH = document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo({ top: docH * prog, behavior: 'smooth' });
            });
          } else {
            // Vai alla pagina corrispondente
            const pagina = Math.round(prog * (pagineEbook.length - 1));
            mostraPagina(pagina);
          }
        }
      }

    } catch (err) {
      console.error('Errore nel caricamento della storia:', err);
      document.getElementById('storia-titolo').textContent = 'Storia non trovata';
      document.getElementById('testo-storia').innerHTML =
        '<p>Impossibile caricare la storia richiesta.</p>';
    }
  }

  /* ── Init ───────────────────────────────────────────────── */

  function inizializza() {
    // Prima carica le impostazioni salvate
    caricaImpostazioni();

    // Poi carica la storia (usa la modalità già impostata)
    caricaStoria();

    // ── Tema ──
    document.querySelectorAll('.btn-tema').forEach(btn => {
      btn.addEventListener('click', () => applicaTema(btn.dataset.tema));
    });

    // ── Dimensione testo ──
    document.getElementById('aumenta').addEventListener('click', () => {
      if (dimIndice < DIMENSIONI.length - 1) {
        dimIndice++;
        applicaDimensione();
        if (modalita === 'libro') { costruisciPagine(); mostraPagina(0); }
      }
    });
    document.getElementById('diminuisci').addEventListener('click', () => {
      if (dimIndice > 0) {
        dimIndice--;
        applicaDimensione();
        if (modalita === 'libro') { costruisciPagine(); mostraPagina(0); }
      }
    });

    // ── Modalità ──
    document.querySelectorAll('.btn-modalita').forEach(btn => {
      btn.addEventListener('click', () => applicaModalita(btn.dataset.modalita));
    });

    // ── Toggle barra ──
    document.getElementById('toggleProgresso').addEventListener('change', () => {
      aggiornaVisibilitaBarra();
      salvaImpostazioni();
    });

    // ── Pannello ──
    document.getElementById('btnImpostazioni').addEventListener('click', apriPannello);
    document.getElementById('chiudiPannello').addEventListener('click', chiudiPannello);
    document.getElementById('overlay').addEventListener('click', chiudiPannello);

    // ── Navigazione ebook: click ──
    document.getElementById('paginaSuccessiva')
      .addEventListener('click', () => mostraPagina(paginaCorrente + 1));
    document.getElementById('paginaPrecedente')
      .addEventListener('click', () => mostraPagina(paginaCorrente - 1));

    // ── Navigazione ebook: tastiera ──
    document.addEventListener('keydown', e => {
      if (modalita !== 'libro') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        mostraPagina(paginaCorrente + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        mostraPagina(paginaCorrente - 1);
    });

    // ── Navigazione ebook: swipe touch ──
    document.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (modalita !== 'libro') return;
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) {
        if (diff > 0) mostraPagina(paginaCorrente + 1);
        else           mostraPagina(paginaCorrente - 1);
      }
    }, { passive: true });

    // ── Scroll progress ──
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializza);
  } else {
    inizializza();
  }

})();
