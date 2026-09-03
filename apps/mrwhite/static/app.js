// ============================================================
// Theme toggle — shared "workshop-theme" key so lighting stays
// in sync with the parent dashboard and every other sub-app.
// ============================================================
(function initTheme() {
  const KEY = 'workshop-theme';
  const saved = localStorage.getItem(KEY) || 'day';
  document.documentElement.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('themeToggle');
    const stateLabel = document.getElementById('themeState');
    const flood = document.getElementById('lightFlood');
    if (!toggle) return;

    function setLabel(theme) {
      if (stateLabel) stateLabel.textContent = theme === 'night' ? 'Night' : 'Day';
    }
    setLabel(saved);

    toggle.addEventListener('click', (e) => {
      const current = document.documentElement.getAttribute('data-theme') || 'day';
      const next = current === 'night' ? 'day' : 'night';
      const rect = toggle.getBoundingClientRect();
      if (flood) {
        flood.style.setProperty('--flood-x', (rect.left + rect.width / 2) + 'px');
        flood.style.setProperty('--flood-y', (rect.top + rect.height / 2) + 'px');
        flood.classList.remove('active');
        void flood.offsetWidth;
        flood.classList.add('active');
      }
      setTimeout(() => {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(KEY, next);
        setLabel(next);
      }, 300);
    });

    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        setLabel(e.newValue);
      }
    });
  });
})();

// Shared helper: poll a background job until it's done or errors out.
async function pollJob(jobId, onUpdate) {
  while (true) {
    const res = await fetch('api/job/' + jobId);
    const data = await res.json();
    if (onUpdate) onUpdate(data);
    if (data.status === 'done') return data;
    if (data.status === 'error') throw new Error(data.error || 'Job failed');
    await new Promise(r => setTimeout(r, 1200));
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ------------------------------------------------------------------
// Everything below only runs on the dashboard page.
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const liveLog = document.getElementById('live-log');
  const logStatus = document.getElementById('log-status');
  if (!liveLog) return; // not on the dashboard page

  // ---------------- in-app viewer modal ----------------
  const viewerOverlay = document.getElementById('viewer-overlay');
  const viewerFrame = document.getElementById('viewer-modal-frame');
  const viewerTitle = document.getElementById('viewer-modal-title');

  function openViewer(url, title) {
    viewerTitle.textContent = title || 'Viewer';
    viewerFrame.src = url;
    viewerOverlay.classList.remove('hidden');
  }
  function closeViewer() {
    viewerOverlay.classList.add('hidden');
    viewerFrame.src = 'about:blank';
  }
  document.getElementById('viewer-modal-close').addEventListener('click', closeViewer);
  viewerOverlay.addEventListener('click', (e) => { if (e.target === viewerOverlay) closeViewer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !viewerOverlay.classList.contains('hidden')) closeViewer(); });

  // delegate clicks on any in-app viewer link so results rendered later still work
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.viewer-link');
    if (!link) return;
    e.preventDefault();
    openViewer(link.getAttribute('href'), link.dataset.viewerTitle || link.textContent.trim());
  });

  function showLog(data, label) {
    logStatus.textContent = label + ' — ' + data.status;
    liveLog.textContent = data.log || '(no output yet)';
    liveLog.scrollTop = liveLog.scrollHeight;
  }

  // ---------------- tabs ----------------
  function activateTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // honor Workshop action deep-links: /apps/mrwhite/?tab=analytics etc.
  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab');
  if (initialTab) activateTab(initialTab);

  // ---------------- logout ----------------
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('api/logout', { method: 'POST' });
    window.location.href = '.';
  });

  // ---------------- fetch conversations ----------------
  let allConversations = [];
  const convListEl = document.getElementById('conv-list');
  const downloadActions = document.getElementById('download-actions');

  document.getElementById('fetch-conv-btn').addEventListener('click', async () => {
    convListEl.innerHTML = '';
    downloadActions.classList.add('hidden');
    const btn = document.getElementById('fetch-conv-btn');
    btn.disabled = true;
    btn.textContent = 'Fetching...';
    try {
      const res = await fetch('api/conversations', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const result = await pollJob(data.job_id, d => showLog(d, 'Fetching conversations'));
      allConversations = result.result || [];
      renderConversations();
    } catch (err) {
      convListEl.innerHTML = `<div class="banner banner-fail">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Fetch conversations';
    }
  });

  function renderConversations() {
    if (allConversations.length === 0) {
      convListEl.innerHTML = '<p class="hint">No conversations found.</p>';
      return;
    }
    convListEl.innerHTML = allConversations.map(c => `
      <label class="conv-item">
        <input type="checkbox" class="conv-check" value="${c.index}"><span class="clay-box"></span>
        <div>
          <div class="conv-title">${escapeHtml(c.title)}</div>
          <div class="conv-meta">${escapeHtml(c.participants || '')}${c.preview ? ' · ' + escapeHtml(c.preview) : ''}</div>
        </div>
      </label>
    `).join('');
    downloadActions.classList.remove('hidden');
  }

  document.getElementById('select-all').addEventListener('change', (e) => {
    document.querySelectorAll('.conv-check').forEach(cb => cb.checked = e.target.checked);
  });

  // ---------------- download ----------------
  document.getElementById('download-btn').addEventListener('click', async () => {
    const indices = Array.from(document.querySelectorAll('.conv-check:checked')).map(cb => parseInt(cb.value, 10));
    const resultsEl = document.getElementById('download-results');
    if (indices.length === 0) {
      resultsEl.innerHTML = '<div class="banner banner-fail">Select at least one conversation first.</div>';
      return;
    }
    const btn = document.getElementById('download-btn');
    btn.disabled = true;
    btn.textContent = 'Cooking...';
    resultsEl.innerHTML = '';
    try {
      const res = await fetch('api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indices })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const result = await pollJob(data.job_id, d => showLog(d, 'Downloading'));
      const names = (result.result && result.result.names) || [];
      resultsEl.innerHTML = `
        <div class="banner banner-ok">
          ${result.result.success}/${result.result.total} conversations backed up.
          ${names.map(n => `<div><a class="file-link viewer-link" href="backups/${encodeURIComponent(n)}/${encodeURIComponent(n)}.html" data-viewer-title="${escapeHtml(n)}">Open "${escapeHtml(n)}" viewer →</a></div>`).join('')}
        </div>`;
    } catch (err) {
      resultsEl.innerHTML = `<div class="banner banner-fail">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Download selected';
    }
  });

  // ---------------- analytics ----------------
  document.getElementById('analytics-btn').addEventListener('click', async () => {
    const resultsEl = document.getElementById('analytics-results');
    const btn = document.getElementById('analytics-btn');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    resultsEl.innerHTML = '';
    try {
      const res = await fetch('api/analytics', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await pollJob(data.job_id, d => showLog(d, 'Generating analytics'));
      resultsEl.innerHTML = `
        <div class="banner banner-ok">
          Dashboard ready.
          <div><a class="file-link viewer-link" href="backups/analytics/dashboard.html" data-viewer-title="Analytics dashboard">Open analytics dashboard →</a></div>
        </div>`;
    } catch (err) {
      resultsEl.innerHTML = `<div class="banner banner-fail">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate dashboard';
    }
  });

  // ---------------- search ----------------
  document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('search-input').value.trim();
    const resultsEl = document.getElementById('search-results');
    if (!q) return;
    resultsEl.innerHTML = '<p class="hint">Searching...</p>';
    try {
      const res = await fetch('api/search?q=' + encodeURIComponent(q));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.results.length === 0) {
        resultsEl.innerHTML = '<p class="hint">No results found.</p>';
        return;
      }
      resultsEl.innerHTML = data.results.map(r => `
        <div class="result-card">
          <div class="result-meta">${escapeHtml(r.conversation)} · @${escapeHtml(r.sender)} · ${escapeHtml(r.timestamp || '')}</div>
          <div class="result-text">${escapeHtml(r.text || '')}</div>
          ${r.reel_url ? `<div><a href="${r.reel_url}" target="_blank">${r.reel_url}</a></div>` : ''}
          ${r.url && r.url !== r.reel_url ? `<div><a href="${r.url}" target="_blank">${r.url}</a></div>` : ''}
        </div>
      `).join('');
    } catch (err) {
      resultsEl.innerHTML = `<div class="banner banner-fail">${escapeHtml(err.message)}</div>`;
    }
  });

  // ---------------- archive ----------------
  document.getElementById('archive-btn').addEventListener('click', async () => {
    const resultsEl = document.getElementById('archive-results');
    const btn = document.getElementById('archive-btn');
    btn.disabled = true;
    btn.textContent = 'Zipping...';
    resultsEl.innerHTML = '';
    try {
      const res = await fetch('api/archive', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const result = await pollJob(data.job_id, d => showLog(d, 'Creating archive'));
      const fullPath = result.result;
      const filename = fullPath.split('/').pop().split('\\').pop();
      resultsEl.innerHTML = `
        <div class="banner banner-ok">
          Archive created.
          <div><a class="file-link" href="download-archive/${encodeURIComponent(filename)}">Download ${escapeHtml(filename)} →</a></div>
        </div>`;
    } catch (err) {
      resultsEl.innerHTML = `<div class="banner banner-fail">${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create archive';
    }
  });
});
