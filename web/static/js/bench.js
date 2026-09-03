/*
 * Workshop — bench view behaviour
 * -----------------------------------
 * Core dashboard behaviour: theme, rescan, the embedded app viewer,
 * pins, recent tracking, category/text filtering, and the rebuild
 * modals. Explore's own #searchInput filter (below) only matches
 * name/folder/description/category/keywords — it deliberately does
 * NOT do action/command resolution; that's Quick Find's job entirely
 * (quickfind.js), including the Ctrl+K shortcut. recordRecent()/pin
 * toggling here are exposed as globals for quickfind.js to call.
 */

  // ----- Theme toggle (day/night): dashboard dips out, a message plays, then the lights actually change -----
  (function () {
    const root = document.documentElement;
    const toggle = document.getElementById('themeToggle');
    const stateLabel = document.getElementById('themeState');
    const sheet = document.querySelector('.sheet');
    const overlay = document.getElementById('eyeOverlay');
    const overlayMessage = document.getElementById('eyeMessage');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const MESSAGES = {
      night: "Take care of your eyes, bro!",
      day: "Hey, why are you going back? You wish to be blind or what?"
    };

    function apply(theme) {
      root.setAttribute('data-theme', theme);
      toggle.setAttribute('aria-pressed', theme === 'night' ? 'true' : 'false');
      stateLabel.textContent = theme === 'night' ? 'Night' : 'Day';
    }

    const stored = localStorage.getItem('workshop-theme');
    const preferred = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
    apply(preferred);

    let busy = false;

    toggle.addEventListener('click', function () {
      if (busy) return;
      const current = root.getAttribute('data-theme') === 'night' ? 'night' : 'day';
      const next = current === 'night' ? 'day' : 'night';

      if (reduceMotion) {
        apply(next);
        localStorage.setItem('workshop-theme', next);
        return;
      }

      busy = true;
      overlayMessage.textContent = MESSAGES[next];
      sheet.classList.add('dimmed');
      overlay.classList.add('show');

      setTimeout(function () {
        apply(next);
        localStorage.setItem('workshop-theme', next);
      }, 450);

      setTimeout(function () {
        overlay.classList.remove('show');
        sheet.classList.remove('dimmed');
      }, 1500);

      setTimeout(function () { busy = false; }, 1850);
    });
  })();

  // ----- Counter that ticks up to the tool count on load -----
  (function () {
    const el = document.getElementById('toolCount');
    const target = parseInt(el.dataset.count, 10) || 0;
    if (target === 0) { el.textContent = '0'; return; }
    const duration = 500;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = Math.round(p * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  // ----- Rescan: spin the icon briefly before navigating, so the click reads as real work -----
  document.getElementById('rescanBtn').addEventListener('click', function (e) {
    e.preventDefault();
    const href = this.getAttribute('href');
    this.classList.add('spinning');
    setTimeout(function () { window.location.href = href; }, 320);
  });

  // ----- Rebuild (single tool) modal -----
  let pendingFolder = null;

  function openRebuildModal(folder, name) {
    pendingFolder = folder;
    document.getElementById('modalAppName').textContent = name;
    document.getElementById('rebuildModal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('rebuildModal').classList.remove('active');
    pendingFolder = null;
  }

  document.getElementById('modalConfirmBtn').addEventListener('click', function () {
    if (pendingFolder) {
      window.location.href = '/rebuild/' + pendingFolder;
    }
  });

  document.getElementById('rebuildModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // ----- Rebuild ALL tools (Quick Find system command) -----
  window.runRebuildAll = function () {
    const modal = document.getElementById('rebuildAllModal');
    const title = document.getElementById('rebuildAllTitle');
    const body = document.getElementById('rebuildAllBody');
    const actions = document.getElementById('rebuildAllActions');
    const eyebrow = document.getElementById('rebuildAllEyebrow');
    title.textContent = 'Rebuilding all tools…';
    body.textContent = 'Only tools that actually changed will do real work — anything already current is a fast no-op.';
    eyebrow.textContent = 'Working';
    actions.style.display = 'none';
    modal.classList.add('active');

    fetch('/api/rebuild-all', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        eyebrow.textContent = 'Done';
        if (data.failed && data.failed.length) {
          title.textContent = 'Finished with failures';
          body.textContent = data.failed.join(', ') + ' failed to build. Check each tool\u2019s build log for details.';
        } else {
          title.textContent = 'All tools are up to date';
          body.textContent = 'Reload the bench to see the latest state.';
        }
        actions.style.display = 'flex';
      })
      .catch(function () {
        eyebrow.textContent = 'Error';
        title.textContent = 'Rebuild request failed';
        body.textContent = 'Could not reach the server. Check the terminal running run.py.';
        actions.style.display = 'flex';
      });
  };

  // ----- Recent tools (server-persisted "Continue Working") -----
  window.recordRecent = function (folder) {
    fetch('/api/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folder })
    }).catch(function () { /* best-effort — a dashboard reload will just be stale once */ });
  };

  const clearRecentBtn = document.getElementById('clearRecentBtn');
  if (clearRecentBtn) {
    clearRecentBtn.addEventListener('click', function () {
      fetch('/api/recent/clear', { method: 'POST' }).then(function () { window.location.reload(); });
    });
  }

  // ----- Pinned tools (star toggle, delegated across every grid) -----
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.pin-btn');
    if (!btn) return;
    e.preventDefault();
    const folder = btn.dataset.folder;
    btn.classList.add('busy');
    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: folder })
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        // The Pinned section's membership can only change correctly by
        // re-rendering from the server — reload keeps this simple and
        // correct rather than hand-rolling a DOM move for a rare action.
        window.location.reload();
      })
      .catch(function () { btn.classList.remove('busy'); });
  });

  // ----- Modal dismiss on backdrop click (shared by the simple modals) -----
  ['rebuildAllModal'].forEach(function (id) {
    const el = document.getElementById(id);
    el.addEventListener('click', function (e) {
      if (e.target === el) el.classList.remove('active');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeModal();
    document.getElementById('rebuildAllModal').classList.remove('active');
    document.getElementById('shortcutsOverlay').classList.remove('active');
    if (!document.fullscreenElement) closeAppViewer();
  });

  // ----- "?" opens the shortcut help overlay; "/" focuses the filter field -----
  document.addEventListener('keydown', function (e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if (e.key === '?' && !typing) {
      e.preventDefault();
      document.getElementById('shortcutsOverlay').classList.add('active');
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
  });

  document.getElementById('shortcutsOverlay').addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('active');
  });

  // ----- In-page app viewer: open sub-apps as tabs inside an embedded
  // frame instead of a new browser tab, so several can be open at once
  // and switched between without losing their state. A plain modifier
  // click (ctrl/cmd/shift/middle) still falls through to the real link
  // so people can pop one out to a real tab if they want. Apps whose
  // meta.json sets "open": "tab" skip this viewer entirely (handled by
  // the template, which renders a normal target="_blank" link for them). -----
  (function () {
    const overlay = document.getElementById('appViewer');
    const frameEl = document.getElementById('viewerFrame');
    const tabsEl = document.getElementById('viewerTabs');
    const bodyEl = document.getElementById('viewerBody');
    const emptyEl = document.getElementById('viewerEmpty');
    const popoutBtn = document.getElementById('viewerPopoutBtn');
    const closeBtn = document.getElementById('viewerCloseBtn');
    const fullscreenBtn = document.getElementById('viewerFullscreenBtn');

    // folder -> { tabEl, paneEl, iframeEl }
    const openTabs = new Map();
    let activeFolder = null;

    function setActive(folder) {
      if (!openTabs.has(folder)) return;
      activeFolder = folder;
      openTabs.forEach(function (t, key) {
        const isActive = key === folder;
        t.tabEl.classList.toggle('active', isActive);
        t.paneEl.classList.toggle('active', isActive);
      });
      const t = openTabs.get(folder);
      popoutBtn.href = t.url;
      emptyEl.style.display = 'none';
    }

    function closeTab(folder) {
      const t = openTabs.get(folder);
      if (!t) return;
      t.tabEl.remove();
      t.paneEl.remove();
      openTabs.delete(folder);

      if (activeFolder === folder) {
        activeFolder = null;
        const remaining = Array.from(openTabs.keys());
        if (remaining.length) {
          setActive(remaining[remaining.length - 1]);
        } else {
          emptyEl.style.display = 'flex';
          popoutBtn.href = '#';
          closeAppViewer();
        }
      }
    }

    window.openAppViewer = function (e, folder, name, path) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
        return true; // let the browser handle it natively (new tab/window)
      }
      e.preventDefault();

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      const url = '/apps/' + encodeURIComponent(folder) + '/' + (path || '');

      if (openTabs.has(folder)) {
        const t = openTabs.get(folder);
        // A plain "Open" (no path) on an already-open tab just refocuses it,
        // keeping whatever state that tool has built up. A Quick Find
        // ACTION with a specific path is a real navigation request, though —
        // e.g. picking "Convert JPG to PNG" while the tool's already open on
        // something else should actually take you there, not just refocus.
        if (path && t.url !== url) {
          t.iframeEl.src = url;
          t.url = url;
        }
        setActive(folder);
        return false;
      }

      recordRecent(folder);

      const tabEl = document.createElement('button');
      tabEl.type = 'button';
      tabEl.className = 'viewer-tab';
      tabEl.title = name;
      tabEl.innerHTML = '<span class="viewer-tab-name"></span><span class="viewer-tab-close" title="Close this tab">✕</span>';
      tabEl.querySelector('.viewer-tab-name').textContent = name;
      tabEl.addEventListener('click', function (ev) {
        if (ev.target.closest('.viewer-tab-close')) {
          ev.stopPropagation();
          closeTab(folder);
        } else {
          setActive(folder);
        }
      });

      const paneEl = document.createElement('div');
      paneEl.className = 'viewer-pane';
      const loadingEl = document.createElement('div');
      loadingEl.className = 'viewer-pane-loading';
      loadingEl.innerHTML = '<span class="spin">⟲</span> Loading…';
      const iframeEl = document.createElement('iframe');
      iframeEl.title = name;
      iframeEl.src = url;
      iframeEl.addEventListener('load', function () {
        loadingEl.classList.add('hidden');
      });
      paneEl.appendChild(loadingEl);
      paneEl.appendChild(iframeEl);

      tabsEl.appendChild(tabEl);
      bodyEl.appendChild(paneEl);
      openTabs.set(folder, { tabEl: tabEl, paneEl: paneEl, iframeEl: iframeEl, url: url });
      setActive(folder);
      tabEl.scrollIntoView({ inline: 'nearest' });
      return false;
    };

    // Opens a tool from OUTSIDE the grid (e.g. a Quick Find result) the
    // exact same way a card's Open button would, including launch mode.
    // `path` is an optional action path (e.g. "?from=jpg&to=png") appended
    // straight after the tool's base URL — see docs/app-development-guide.md.
    window.openAppById = function (folder, name, openMode, path) {
      if (openMode === 'tab') {
        recordRecent(folder);
        window.open('/apps/' + encodeURIComponent(folder) + '/' + (path || ''), '_blank');
        return;
      }
      const fakeEvent = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0, preventDefault: function () {} };
      window.openAppViewer(fakeEvent, folder, name, path);
    };

    window.closeAppViewer = function () {
      if (!overlay.classList.contains('active')) return;
      if (document.fullscreenElement) document.exitFullscreen();
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (overlay.classList.contains('active')) return;
        openTabs.forEach(function (t) { t.tabEl.remove(); t.paneEl.remove(); });
        openTabs.clear();
        activeFolder = null;
        emptyEl.style.display = 'flex';
      }, 250);
    };

    closeBtn.addEventListener('click', closeAppViewer);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeAppViewer();
    });

    fullscreenBtn.addEventListener('click', function () {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (frameEl.requestFullscreen) {
        frameEl.requestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', function () {
      fullscreenBtn.classList.toggle('active', !!document.fullscreenElement);
    });
  })();

  // ----- Filtering: free-text search + category chips, scoped to the
  // "All Tools" grid only — Pinned/Continue Working are short, curated
  // lists where filtering them out would just be confusing. -----
  (function () {
    const searchInput = document.getElementById('searchInput');
    const chipRow = document.getElementById('categoryChips');
    const grid = document.getElementById('appsGrid');
    if (!grid) return;
    let activeCategory = '__all__';

    function applyFilters() {
      const q = searchInput.value.trim().toLowerCase();
      grid.querySelectorAll('.app-item').forEach(function (el) {
        const matchesText = !q || el.dataset.search.includes(q);
        const matchesCategory = activeCategory === '__all__' || el.dataset.category === activeCategory;
        el.style.display = (matchesText && matchesCategory) ? '' : 'none';
      });
    }

    searchInput.addEventListener('input', applyFilters);

    if (chipRow) {
      chipRow.addEventListener('click', function (e) {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        chipRow.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        activeCategory = chip.dataset.category;
        applyFilters();
      });
    }
  })();
