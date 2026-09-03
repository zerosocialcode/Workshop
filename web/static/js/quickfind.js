/*
 * Workshop — dual-mode entry (Explore / Quick Find)
 * ------------------------------------------------------
 * The two modes are deliberately NOT the same feature twice:
 *
 *   Explore     — browse & filter tools by name/category. #searchInput
 *                 (wired in bench.js) is a plain client-side filter over
 *                 name/folder/description/category/keywords — it does
 *                 NOT resolve actions, run commands, or do task matching.
 *                 That's the whole point of the split: Explore answers
 *                 "which tool is this", nothing else.
 *
 *   Quick Find  — the ONLY place query/action/command resolution lives.
 *                 One big input; type a tool name, a task ("convert jpg
 *                 to png"), a sum ("25% of 480"), or a system command
 *                 ("toggle theme", "rescan"), and it resolves + jumps.
 *                 This is also where Ctrl+K goes (see bottom of file) —
 *                 there is no separate command-palette overlay anymore;
 *                 Quick Find *is* the command palette, just full-page
 *                 instead of a modal, so the two modes never duplicate
 *                 each other's job.
 *
 * Tool/action matching itself lives in resolver.js (window.WorkshopResolver)
 * — this file adds system commands (which aren't tools and don't belong
 * in resolver.js) and turns everything into the rendered, keyboard-
 * navigable result list.
 *
 * Also owns the minimal "Continue with" suggestion (see renderIdle) —
 * the deliberately small first step docs/platform-evolution.md's Phase 7
 * asks for before any real workflow/pipeline feature: no data pipe, no
 * canvas, just a label match between one tool's declared "produces" and
 * another's "accepts" (see docs/app-development-guide.md §6b).
 */
(function () {
  const R = window.WorkshopResolver;
  const APPS = JSON.parse(document.getElementById('appsData').textContent || '[]');

  const gate = document.getElementById('landingGate');
  const exploreView = document.getElementById('exploreView');
  const quickfindView = document.getElementById('quickfindView');
  const modeExploreBtn = document.getElementById('modeExploreBtn');
  const modeQuickfindBtn = document.getElementById('modeQuickfindBtn');
  const qfInput = document.getElementById('quickfindInput');
  const qfResults = document.getElementById('quickfindResults');
  const qfBrowseBtn = document.getElementById('quickfindBrowseBtn');

  const MODE_KEY = 'workshop-mode';
  const SEEN_KEY = 'workshop-entry-seen';

  // ----- System commands (not tools, so they don't belong in resolver.js /
  // meta.json — this is Workshop's own fixed command set) -----
  const SYSTEM_COMMANDS = [
    {
      id: 'rebuild-all', label: 'Rebuild all tools',
      hint: 'Re-checks every tool and rebuilds only what changed',
      run: function () { window.runRebuildAll(); }
    },
    {
      id: 'rescan', label: 'Rescan bench',
      hint: 'Re-lists apps/ without rebuilding anything',
      run: function () { document.getElementById('rescanBtn').click(); }
    },
    {
      id: 'toggle-theme', label: 'Toggle day / night lights',
      hint: 'Switch the drafting-paper and blueprint themes',
      run: function () { document.getElementById('themeToggle').click(); }
    },
    {
      id: 'clear-recent', label: 'Clear recent activity',
      hint: 'Empties the Continue Working section',
      run: function () {
        fetch('/api/recent/clear', { method: 'POST' }).then(function () { window.location.reload(); });
      }
    },
    {
      id: 'shortcuts', label: 'Show keyboard shortcuts',
      hint: 'Ctrl+K, /, ?, arrows, Esc',
      run: function () { document.getElementById('shortcutsOverlay').classList.add('active'); }
    }
  ];

  let recentState = { recent: [], recent_commands: [] };
  function fetchRecentState() {
    fetch('/api/state').then(function (r) { return r.json(); }).then(function (data) {
      recentState = data;
    }).catch(function () { /* Quick Find still works without recent history */ });
  }
  fetchRecentState();

  function recordCommandUsed(id, label) {
    fetch('/api/commands/used', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, label: label })
    }).catch(function () {});
  }

  // ----- Mode switching (Explore <-> Quick Find) -----
  function setMode(mode, opts) {
    opts = opts || {};
    const isQuickfind = mode === 'quickfind';
    exploreView.style.display = isQuickfind ? 'none' : '';
    quickfindView.classList.toggle('active', isQuickfind);
    modeExploreBtn.classList.toggle('active', !isQuickfind);
    modeExploreBtn.setAttribute('aria-selected', String(!isQuickfind));
    modeQuickfindBtn.classList.toggle('active', isQuickfind);
    modeQuickfindBtn.setAttribute('aria-selected', String(isQuickfind));
    localStorage.setItem(MODE_KEY, mode);
    if (isQuickfind) {
      fetchRecentState();
      if (!opts.skipFocus) {
        renderQuickfind(qfInput.value || '');
        setTimeout(function () { qfInput.focus(); }, 10);
      }
    }
  }
  window.setWorkshopMode = setMode;

  modeExploreBtn.addEventListener('click', function () { setMode('explore'); });
  modeQuickfindBtn.addEventListener('click', function () { setMode('quickfind'); });
  qfBrowseBtn.addEventListener('click', function () { setMode('explore'); });

  // ----- One-time landing gate -----
  function closeGate(chosenMode) {
    gate.classList.remove('active');
    localStorage.setItem(SEEN_KEY, '1');
    document.body.style.overflow = '';
    if (chosenMode) setMode(chosenMode);
  }

  document.getElementById('landingExploreBtn').addEventListener('click', function () { closeGate('explore'); });
  document.getElementById('landingQuickfindBtn').addEventListener('click', function () { closeGate('quickfind'); });
  document.getElementById('landingSkipBtn').addEventListener('click', function () { closeGate(null); });
  gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(null); });

  const storedMode = localStorage.getItem(MODE_KEY) || 'explore';
  setMode(storedMode, { skipFocus: true });

  if (!localStorage.getItem(SEEN_KEY)) {
    gate.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ----- Ctrl+K: jump straight into Quick Find (no separate overlay) -----
  document.addEventListener('keydown', function (e) {
    const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (!ctrlK) return;
    e.preventDefault();
    setMode('quickfind');
    qfInput.select();
  });

  // ----- Result row builders -----
  let qfItems = [];
  let qfSelected = 0;

  function toolRow(app) {
    return {
      key: 'tool:' + app.folder,
      title: app.name,
      meta: app.category + (app.description ? ' — ' + app.description : ''),
      disabled: app.state !== 'ready',
      disabledReason: app.state !== 'ready' ? app.state.replace('_', ' ') : '',
      run: function () { openTool(app); }
    };
  }

  function actionRow(app, action) {
    return {
      key: 'action:' + app.folder + ':' + action.label,
      title: action.label,
      meta: 'in ' + app.name,
      disabled: app.state !== 'ready',
      disabledReason: app.state !== 'ready' ? app.state.replace('_', ' ') : '',
      run: function () { openAction(app, action); }
    };
  }

  function commandRow(cmd) {
    return {
      key: 'cmd:' + cmd.id,
      title: cmd.label,
      meta: cmd.hint,
      disabled: false,
      run: function () { recordCommandUsed(cmd.id, cmd.label); cmd.run(); }
    };
  }

  function openTool(app) {
    if (app.state !== 'ready') return;
    recordCommandUsed('tool:' + app.folder, 'Open ' + app.name);
    if (window.recordRecent) window.recordRecent(app.folder);
    window.openAppById(app.folder, app.name, app.open_mode);
  }

  function openAction(app, action) {
    if (app.state !== 'ready') return;
    recordCommandUsed('action:' + app.folder + ':' + action.label, action.label + ' — ' + app.name);
    if (window.recordRecent) window.recordRecent(app.folder);
    window.openAppById(app.folder, app.name, app.open_mode, action.path);
  }

  // ----- Rendering -----
  function rowEl(item, isActive) {
    const row = document.createElement('div');
    row.className = 'quickfind-item' + (isActive ? ' active' : '') + (item.disabled ? ' disabled' : '');
    row.innerHTML = '<span class="quickfind-item-title"></span><span class="quickfind-item-meta"></span>';
    row.querySelector('.quickfind-item-title').textContent = item.title;
    row.querySelector('.quickfind-item-meta').textContent = item.disabled ? item.disabledReason : item.meta;
    return row;
  }

  // Renders one labeled group of qfItems, starting at absolute index
  // `startIndex` within the flat qfItems array (keeps arrow-key nav and
  // click handlers correct regardless of how many groups are on screen).
  function renderGroup(label, bannerClass, group, startIndex) {
    const banner = document.createElement('div');
    banner.className = 'quickfind-banner' + (bannerClass ? ' ' + bannerClass : '');
    banner.textContent = label;
    qfResults.appendChild(banner);

    const list = document.createElement('div');
    list.className = 'quickfind-list';
    group.forEach(function (item, i) {
      const globalIndex = startIndex + i;
      const row = rowEl(item, globalIndex === qfSelected);
      row.addEventListener('mouseenter', function () { qfSelected = globalIndex; refreshRows(); });
      row.addEventListener('click', function () { if (!item.disabled) item.run(); });
      list.appendChild(row);
    });
    qfResults.appendChild(list);
  }

  function refreshRows() {
    const rows = qfResults.querySelectorAll('.quickfind-item');
    rows.forEach(function (row, i) { row.classList.toggle('active', i === qfSelected); });
  }

  function renderChipPrompt(label, examples) {
    const hint = document.createElement('div');
    hint.className = 'quickfind-hint';
    const labelEl = document.createElement('div');
    labelEl.className = 'quickfind-hint-label';
    labelEl.textContent = label;
    hint.appendChild(labelEl);
    const chips = document.createElement('div');
    chips.className = 'quickfind-chips';
    examples.forEach(function (ex) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'quickfind-chip';
      chip.textContent = ex;
      chip.addEventListener('click', function () { qfInput.value = ex; qfInput.focus(); renderQuickfind(ex); });
      chips.appendChild(chip);
    });
    hint.appendChild(chips);
    qfResults.appendChild(hint);
  }

  // Idle state (empty query): pick up where you left off — recent tools/
  // commands — rather than dumping the full app list, which would just
  // re-implement Explore's grid inside Quick Find.
  function renderIdle() {
    qfItems = [];
    const recentFolders = (recentState.recent || []).map(function (r) { return r.folder; });
    const recentTools = recentFolders
      .map(function (folder) { return APPS.find(function (a) { return a.folder === folder; }); })
      .filter(Boolean)
      .map(toolRow);

    const recentCommands = (recentState.recent_commands || []).map(function (c) {
      const sysCmd = SYSTEM_COMMANDS.find(function (sc) { return sc.id === c.id; });
      if (sysCmd) return commandRow(sysCmd);
      if (c.id.indexOf('action:') === 0) {
        const rest = c.id.slice('action:'.length);
        const sep = rest.indexOf(':');
        const folder = rest.slice(0, sep);
        const label = rest.slice(sep + 1);
        const app = APPS.find(function (a) { return a.folder === folder; });
        const action = app && (app.actions || []).find(function (a) { return a.label === label; });
        return app && action ? actionRow(app, action) : null;
      }
      if (c.id.indexOf('tool:') === 0) {
        const folder = c.id.slice('tool:'.length);
        const app = APPS.find(function (a) { return a.folder === folder; });
        return app ? toolRow(app) : null;
      }
      return null;
    }).filter(Boolean);

    if (recentTools.length || recentCommands.length) {
      qfItems = recentTools.concat(recentCommands);
      qfSelected = 0;
      if (recentTools.length) renderGroup('Recent', 'low', recentTools, 0);
      if (recentCommands.length) renderGroup('Recently used', 'low', recentCommands, recentTools.length);

      // Phase 8 (minimal, per docs/platform-evolution.md Phase 7's own
      // "deliberately simple first version" gate): no data pipe, no
      // canvas — just a label-matching suggestion. If the most recent
      // tool declares "produces" and another ready tool declares an
      // overlapping "accepts", surface it. Nothing is passed between
      // tools; the person still moves their own output across.
      const lastApp = APPS.find(function (a) { return a.folder === recentFolders[0]; });
      if (lastApp && (lastApp.produces || []).length) {
        const compatible = APPS.filter(function (a) {
          return a.folder !== lastApp.folder && a.state === 'ready' &&
            (a.accepts || []).some(function (tag) { return (lastApp.produces || []).indexOf(tag) !== -1; });
        }).map(toolRow);
        if (compatible.length) {
          renderGroup('Continue with (works with ' + lastApp.name + '\u2019s output)', 'low', compatible, qfItems.length);
          qfItems = qfItems.concat(compatible);
        }
      }
      return;
    }

    renderChipPrompt('Try things like:', R.suggestions(APPS, 6));
  }

  function matchCommands(q) {
    return SYSTEM_COMMANDS.filter(function (c) {
      return c.label.toLowerCase().indexOf(q) !== -1 || c.hint.toLowerCase().indexOf(q) !== -1;
    }).map(commandRow);
  }

  function renderQuickfind(rawQuery, opts) {
    opts = opts || {};
    const q = rawQuery.trim();
    qfResults.innerHTML = '';
    qfSelected = 0;

    if (opts.droppedName) {
      const note = document.createElement('div');
      note.className = 'quickfind-dropped-note';
      note.textContent = 'Dropped "' + opts.droppedName + '" — showing matches for .' + q;
      qfResults.appendChild(note);
    }

    if (!q) { renderIdle(); return; }

    const resolved = R.resolve(APPS, q);
    const actionItems = resolved.actionMatches.map(function (m) { return actionRow(m.app, m.action); });
    const toolItems = resolved.toolMatches.map(function (m) { return toolRow(m.app); });
    const commandItems = matchCommands(q.toLowerCase());

    qfItems = actionItems.concat(toolItems).concat(commandItems);
    qfSelected = qfItems.findIndex(function (it) { return !it.disabled; });
    if (qfSelected < 0) qfSelected = 0;

    const taskItems = actionItems.concat(toolItems);
    let cursor = 0;

    if (resolved.tier === 'high' && taskItems.length) {
      renderGroup('Best match', 'high', taskItems.slice(0, 1), cursor);
      cursor += 1;
      if (taskItems.length > 1) {
        renderGroup('Other matches', 'low', taskItems.slice(1), cursor);
        cursor += taskItems.length - 1;
      }
    } else if (resolved.tier === 'moderate' && taskItems.length) {
      renderGroup('Possible matches', 'moderate', taskItems, cursor);
      cursor += taskItems.length;
    } else if (resolved.tier === 'low' && taskItems.length) {
      renderGroup('Not sure — closest matches', 'low', taskItems, cursor);
      cursor += taskItems.length;
    }

    if (commandItems.length) {
      renderGroup('Commands', null, commandItems, cursor);
      cursor += commandItems.length;
    }

    if (!qfItems.length) renderNoResults(q);
  }

  function renderNoResults(q) {
    const maybe = R.didYouMean(APPS, q);
    if (maybe) {
      const dym = document.createElement('div');
      dym.className = 'quickfind-dym';
      dym.innerHTML = 'Did you mean <button type="button" class="quickfind-dym-btn"></button>?';
      dym.querySelector('.quickfind-dym-btn').textContent = maybe.name;
      dym.querySelector('.quickfind-dym-btn').addEventListener('click', function () { openTool(maybe); });
      qfResults.appendChild(dym);
    }

    const title = document.createElement('div');
    title.className = 'quickfind-noresult-title';
    title.textContent = "I couldn't confidently identify that task.";
    qfResults.appendChild(title);

    renderChipPrompt('Try:', R.suggestions(APPS, 5));
  }

  qfInput.addEventListener('input', function () { renderQuickfind(qfInput.value); });

  qfInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveQfSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveQfSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = qfItems[qfSelected];
      if (item && !item.disabled) item.run();
    } else if (e.key === 'Escape') {
      if (qfInput.value) {
        qfInput.value = '';
        renderQuickfind('');
      } else {
        setMode('explore');
      }
    }
  });

  function moveQfSelection(delta) {
    if (!qfItems.length) return;
    let next = qfSelected;
    for (let i = 0; i < qfItems.length; i++) {
      next = (next + delta + qfItems.length) % qfItems.length;
      if (!qfItems[next].disabled) break;
    }
    qfSelected = next;
    refreshRows();
    const activeEl = qfResults.querySelector('.quickfind-item.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  // ----- Phase 7: file awareness (drag-and-drop) -----
  // Local-first: only the file NAME is ever inspected (for its extension),
  // never the file's contents, and nothing leaves the browser.
  const qfDropZone = quickfindView;
  let dragDepth = 0;

  qfDropZone.addEventListener('dragenter', function (e) {
    if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth++;
    qfDropZone.classList.add('drag-over');
  });
  qfDropZone.addEventListener('dragover', function (e) {
    if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
    e.preventDefault();
  });
  qfDropZone.addEventListener('dragleave', function () {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) qfDropZone.classList.remove('drag-over');
  });
  qfDropZone.addEventListener('drop', function (e) {
    if (!e.dataTransfer || !hasFiles(e.dataTransfer)) return;
    e.preventDefault();
    dragDepth = 0;
    qfDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ext || ext === file.name.toLowerCase()) return;
    qfInput.value = ext;
    qfInput.focus();
    renderQuickfind(ext, { droppedName: file.name });
  });

  function hasFiles(dt) {
    if (dt.types) return Array.prototype.indexOf.call(dt.types, 'Files') !== -1;
    return !!(dt.files && dt.files.length);
  }
})();
