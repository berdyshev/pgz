// PROTOTYPE (throwaway) — новий макет pgz у стилі IDE для issue #73.
// Демо для обговорення; стан тільки в пам'яті. Не мерджити в main: переписати начисто.
(function () {
  document.documentElement.dataset.proto = 'A';
  document.documentElement.dataset.icons = 'mono';

  const state = { panel: 'закрита', tab: '-', console: 'схована', game: 'не запущена' };
  const $ = (id) => document.getElementById(id);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const refreshEditor = () => requestAnimationFrame(() => window.PythonIDE && PythonIDE.editor && PythonIDE.editor.refresh());

  // ---------- спільні хелпери ----------
  function printedText() {
    // print() дописує текст прямо в #output, після службових елементів
    const out = $('output');
    if (!out) return '';
    const c = out.cloneNode(true);
    c.querySelectorAll('#watch, #headerOut, #btn_showREPL').forEach((n) => n.remove());
    return c.textContent.trim();
  }
  // викликає cb(lines), коли програма щось надрукувала
  function onOutput(cb) {
    let last = '';
    new MutationObserver(() => {
      const t = printedText();
      if (t && t !== last) { last = t; cb(t.split('\n').length); }
      if (!t) last = '';
    }).observe($('output'), { childList: true, subtree: true, characterData: true });
  }
  // викликає cb(message) при помилці виконання (текст помилки сайт сам пише в консоль)
  function onError(cb) {
    const orig = PythonIDE.handleError;
    PythonIDE.handleError = function (err) {
      const r = orig.apply(this, arguments);
      cb(String(err));
      return r;
    };
  }
  // cb(true/false), коли вікно гри показується/ховається
  function onGame(cb) {
    const gm = $('gameModal');
    let shown = false;
    new MutationObserver(() => {
      const now = gm.style.display !== 'none' && gm.style.display !== '';
      if (now !== shown) { shown = now; state.game = now ? 'запущена' : 'не запущена'; cb(now); }
    }).observe(gm, { attributes: true, attributeFilter: ['style'] });
  }
  function hotkeys(map) {
    window.addEventListener('keydown', (e) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return;
      const f = map[e.key.toLowerCase()];
      if (f) { e.preventDefault(); e.stopPropagation(); f(); }
    }, true);
  }
  // Перетягування через pointer capture: інакше iframe посібника «з'їдає» відпускання миші,
  // і панель далі їздить за курсором.
  function pointerDrag(handle, onStart, onMove, onEnd) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('proto-resizing');
      onStart && onStart(e);
      const move = (ev) => onMove(ev);
      const end = () => {
        document.body.classList.remove('proto-resizing');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        onEnd && onEnd();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
  }
  function dragResize(handle, onMove, onDone) {
    pointerDrag(handle, null, onMove, () => { onDone && onDone(); refreshEditor(); });
  }
  function makeDraggable(win, handle) {
    let dx = 0, dy = 0;
    pointerDrag(handle, (e) => {
      const r = win.getBoundingClientRect();
      dx = e.clientX - r.left; dy = e.clientY - r.top;
      win.style.position = 'absolute';
    }, (ev) => { win.style.left = ev.clientX - dx + 'px'; win.style.top = ev.clientY - dy + 'px'; });
  }
  // ========== A: IDE ==========
  // Іконки (SVG, щоб не залежати від шрифтів з емодзі)
  const ICON = {
    images: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 18l5-5 3 3 3-4 5 6"/></svg>',
    audio: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
    handbook: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M8 7h7M8 11h7"/></svg>',
    // як у VS Code: рамка і внутрішня межа є завжди, видима частина зафарбована
    togglePanel: '<svg viewBox="0 0 24 24"><path class="fill" d="M15 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4z"/><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>',
    toggleConsole: '<svg viewBox="0 0 24 24"><path class="fill" d="M3 14h18v4a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 14h18"/></svg>',
    // верхня панель і дії (для однотонного стилю)
    run: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" style="stroke:#4caf50"/><path d="M10 8l6 4-6 4z" style="fill:#4caf50;stroke:#4caf50"/></svg>',
    step: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" style="stroke:#4caf50"/><path d="M9 8l5 4-5 4z" style="fill:#4caf50;stroke:#4caf50"/><path d="M16 8v8" style="stroke:#4caf50"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" style="stroke:#f44336"/><rect x="9" y="9" width="6" height="6" style="fill:#f44336;stroke:#f44336"/></svg>',
    newProject: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M12 17v-6M9 13l3-3 3 3"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M5 3h11l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/></svg>',
    restore: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 103-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M7 10l5-5 5 5M12 5v10"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    add: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    importOnline: '<svg viewBox="0 0 24 24"><path d="M7 18a5 5 0 01-.6-10A6 6 0 0118 9a4 4 0 01-1 8"/><path d="M12 12v8M9 17l3 3 3-3"/></svg>',
    draw: '<svg viewBox="0 0 24 24"><path d="M15 4l5 5L9 20H4v-5z"/><path d="M13 6l5 5"/></svg>',
  };
  function initA() {
    const main = $('mainLayout'), right = $('rightBar'), cons = $('consoleContainer');
    const gallery = $('resourceGallery');
    let tab = 'images';

    // кнопки галереї, імпорту, редактора й посібника переїжджають з верхньої панелі на бокову
    document.querySelectorAll('#toolPanel [onclick*="toggleShowGallery"], #toolPanel [onclick*="openImportModal"], #toolPanel [onclick*="showEditor"], #toolPanel [onclick*="showHandbook"]')
      .forEach((b) => (b.style.display = 'none'));
    document.querySelector('#toolPanel [onclick*="showConsole"]').style.display = 'none'; // замінено кнопкою розкладки
    {
      // src не чіпаємо: pgz за ним вирішує, що робить кнопка «Виконати» (lib.js: imgSrc === "./media/play.png").
      // Однотонну іконку показуємо через CSS content, за ім'ям файлу в src.
      const svgUrl = (svg) => 'data:image/svg+xml,' + encodeURIComponent(
        svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#d4d4d4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '));
      const bySrc = { 'play.png': 'run', 'step.png': 'step', 'stop.png': 'stop', 'new-project.png': 'newProject', 'pgz-open.png': 'open',
        'pgz-save.png': 'save', 'restore-code.png': 'restore', 'share.png': 'share', 'settings.png': 'settings' };
      const css = Object.entries(bySrc).map(([f, ic]) => `#toolPanel img[src$="${f}"] { content: url("${svgUrl(ICON[ic])}"); }`).join('\n');
      document.head.appendChild(el(`<style id="protoMonoIcons">${css}</style>`));
    }

    // кнопки розкладки, як у правому верхньому куті VS Code
    const layout = el(`<div id="protoLayoutBtns">
      <button data-t="console" title="Показати/сховати консоль (Ctrl+J)">${ICON.toggleConsole}</button>
      <button data-t="panel" title="Показати/сховати бокову панель (Ctrl+B)">${ICON.togglePanel}</button></div>`);
    $('projectNameInput').after(layout); // останній у панелі → самий правий край
    // логотип зліва від кнопки «Виконати»: та сама картинка, що була на боковій панелі
    $('toolPanel').prepend(el('<div id="protoLogo" title="PGZ Studio"></div>'));
    styleDrawEditor();
    hintsAsToasts();

    // права панель: заголовок з діями + ресайзер
    const head = el(`<div id="protoPanelHead"><span id="protoPanelTitle"></span>
      <span class="actions"></span>
      <button class="proto-iconbtn" data-a="close" title="Сховати панель">✕</button></div>`);
    right.prepend(head);
    right.prepend(el('<div id="protoPanelResizer"></div>'));
    right.classList.add('proto-closed');

    const TABS = {
      images: { title: 'Зображення', frame: 'imagesFrame', actions: [
        ['add', 'Додати', 'Додати файл з комп\'ютера', () => addFile('image')],
        ['importOnline', 'Імпорт', 'Імпорт з онлайн-галереї', () => openImportModal()],
        ['draw', 'Намалювати', 'Редактор зображень', () => showEditor()],
      ] },
      audio: { title: 'Аудіо', frame: 'soundsFrame', actions: [['add', 'Додати', 'Додати аудіофайл', () => addFile('audio')]] },
      music: { title: 'Музика', frame: 'musicFrame', actions: [['add', 'Додати', 'Додати музику', () => addFile('music')]] },
      handbook: { title: 'Посібник', actions: [] },
    };
    const bar = el(`<div id="protoActivity">${Object.keys(TABS).map((t) =>
      `<button data-tab="${t}" title="${TABS[t].title}">${ICON[t]}<span>${TABS[t].title}</span></button>`).join('')}</div>`);
    main.appendChild(bar);

    const panelOpen = () => !right.classList.contains('proto-closed');
    async function open(t) {
      tab = t;
      right.classList.remove('proto-closed');
      const T = TABS[t];
      $('protoPanelTitle').textContent = T.title;
      const actions = head.querySelector('.actions');
      actions.innerHTML = '';
      T.actions.forEach(([icon, label, title, fn]) => {
        const b = el(`<button class="proto-action" title="${title}">${ICON[icon]}${label}</button>`);
        b.onclick = fn; actions.appendChild(b);
      });
      if (t === 'handbook') {
        gallery.style.display = 'none';
        $('handbook').style.display = 'block';
      } else {
        $('handbook').style.display = 'none';
        gallery.style.display = 'block';
        ['imagesFrame', 'soundsFrame', 'musicFrame'].forEach((id) => ($(id).style.display = id === T.frame ? '' : 'none'));
        await initializeAssetsGallery();
      }
      state.panel = 'відкрита'; state.tab = T.title;
      sync();
    }
    function close() {
      right.classList.add('proto-closed');
      state.panel = 'закрита'; state.tab = '-';
      sync();
    }
    const togglePanel = () => (panelOpen() ? close() : open(tab));
    const toggleTab = (t) => (panelOpen() && tab === t ? close() : open(t));
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => toggleTab(b.dataset.tab)));
    head.querySelector('[data-a=close]').onclick = close;
    dragResize($('protoPanelResizer'), (ev) => {
      const w = Math.min(Math.max(innerWidth - ev.clientX - 64, 260), innerWidth * 0.7);
      document.documentElement.style.setProperty('--proto-pw', w + 'px');
    });

    // консоль: схована, відкривається при виводі/помилці
    const chead = el(`<div id="protoConsoleHead"><span class="tab">Консоль</span>
      <span class="tools"><button class="proto-iconbtn" data-a="clear" title="Очистити">⌫</button>
      <button class="proto-iconbtn" data-a="close" title="Сховати консоль">✕</button></span></div>`);
    cons.before(chead);
    const consOpen = () => cons.style.display !== 'none';
    const setCons = (show) => {
      chead.style.display = cons.style.display = show ? '' : 'none';
      state.console = show ? 'відкрита' : 'схована';
      sync();
    };
    chead.querySelector('[data-a=close]').onclick = () => setCons(false);
    chead.querySelector('[data-a=clear]').onclick = () => [...$('output').childNodes].forEach((n) => !n.id && !(n.querySelector && n.querySelector('#btn_showREPL')) && n.remove());
    dragResize(chead, (ev) => {
      const bottom = cons.getBoundingClientRect().bottom;
      const h = Math.min(Math.max(bottom - ev.clientY - 28, 60), innerHeight * 0.7);
      document.documentElement.style.setProperty('--proto-ch', h + 'px');
    });
    onOutput(() => setCons(true));
    onError(() => setCons(true));

    // підсвітка активних кнопок
    function sync() {
      bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', panelOpen() && b.dataset.tab === tab));
      layout.querySelector('[data-t=panel]').classList.toggle('on', panelOpen());
      layout.querySelector('[data-t=console]').classList.toggle('on', consOpen());
      refreshEditor();
    }
    layout.querySelector('[data-t=panel]').onclick = togglePanel;
    layout.querySelector('[data-t=console]').onclick = () => setCons(!consOpen());
    setCons(false);

    window.toggleShowGallery = () => toggleTab('images');
    window.showHandbook = () => toggleTab('handbook');
    window.showConsole = () => setCons(!consOpen());
    hotkeys({ b: togglePanel, j: window.showConsole });

    // гра: окреме вікно розміру WIDTH×HEIGHT, не блокує сторінку, тягнеться за заголовок
    const inner = $('gameModal').firstElementChild;
    makeDraggable(inner, inner.firstElementChild);
    onGame(() => {});
  }

  // #hintBar посеред верхньої панелі прибираємо. Підказки при наведенні дублюють title,
  // статус запуску видно з кнопки «Виконати/Зупинити». Решта повідомлень (помилки імені
  // файлу, «немає збережених копій» тощо) показуємо коротким сповіщенням унизу праворуч.
  function hintsAsToasts() {
    const alts = new Set([...document.querySelectorAll('#toolPanel img')].map((i) => i.getAttribute('alt')).filter(Boolean));
    const status = /виконується|завершила виконання|is running|completed execution/i;
    let toast = null, timer = null;
    PythonIDE.showHint = function (msg) {
      const text = String(msg || '').replace(/<[^>]*>/g, '').trim();
      if (!text || alts.has(text) || status.test(text)) return;
      if (!toast) { toast = el('<div id="protoToast"></div>'); document.body.appendChild(toast); }
      toast.innerHTML = msg;
      toast.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('show'), 5000);
    };
  }

  // Редактор зображень — окрема сторінка (draw-editor.html) в iframe з того ж сайту,
  // тож просто додаємо в неї стилі під час відкриття.
  function styleDrawEditor() {
    const css = `
      html, body { background: #1e1e1e !important; } body { color: #ccc; font-family: system-ui, "Segoe UI", sans-serif; }
      .cd-top-toolbar, .side-toolbar, .cd-bottom-toolbar { background: #252526 !important; border-color: #3c3c3c !important; }
      .cd-top-toolbar { border-bottom: 1px solid #3c3c3c; }
      .side-toolbar { border-right: 1px solid #3c3c3c; }
      .cd-bottom-toolbar { border-top: 1px solid #3c3c3c; }
      .top-icon-btn:hover, .cd-toolbar-button:hover { background: #ffffff1a !important; }
      .cd-toolbar-button.active { background: #094771 !important; box-shadow: inset 0 0 0 1px #007acc; }
      .canvas-center-wrapper { background-color: #1e1e1e !important; }
      .modal-content { background: #252526 !important; color: #ccc; border: 1px solid #3c3c3c; }
      .btn { border: 0; border-radius: 4px; padding: 6px 14px; cursor: pointer; }
      .btn-ok { background: #0e639c !important; } .btn-ok:hover { background: #1177bb !important; }
      .btn-cancel { background: #3a3d41 !important; } .btn-cancel:hover { background: #45494e !important; }
      input, select { background: #3c3c3c; color: #eee; border: 1px solid #555; border-radius: 4px; }
      .top-icon-btn img, .cd-toolbar-button img { filter: grayscale(1) brightness(1.35); }
      .cd-toolbar-button.active img { filter: grayscale(1) brightness(2); }`;
    new MutationObserver(() => {
      const f = $('drawEditorFrame');
      if (!f || f.dataset.protoStyled) return;
      f.dataset.protoStyled = '1';
      const apply = () => { try { f.contentDocument.head.appendChild(Object.assign(f.contentDocument.createElement('style'), { textContent: css })); } catch (e) {} };
      f.addEventListener('load', apply);
    }).observe(document.body, { childList: true });
  }

  // Гра більше не перекриває редактор, тому клавіші, набрані в редакторі,
  // не віддаємо грі (у pgz усі натискання під час гри йдуть у гру).
  // Клік по полю гри знімає фокус з редактора, і клавіші знову йдуть у гру.
  function editorKeysStayInEditor() {
    const handler = () => {
      const a = document.activeElement;
      if (!PythonIDE.running || !a || !a.closest('.CodeMirror')) return;
      const saved = PythonIDE.keyHandlers;
      PythonIDE.keyHandlers = [];
      setTimeout(() => { if (!PythonIDE.keyHandlers.length) PythonIDE.keyHandlers = saved; });
    };
    window.addEventListener('keydown', handler, true);
    window.addEventListener('keyup', handler, true);
  }

  window.addEventListener('load', () => setTimeout(() => {
    initA();
    editorKeysStayInEditor();
    refreshEditor();
  }, 0));
})();
