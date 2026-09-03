/*
 * Workshop — shared intent/action resolution engine
 * ----------------------------------------------------
 * This is the ONE place that turns a typed query into ranked matches
 * against the app ecosystem (apps + their declared actions/keywords/
 * intents from meta.json). Used exclusively by Quick Find
 * (quickfind.js) — Explore's own filter (bench.js #searchInput) is a
 * separate, deliberately dumber plain-text match over name/keywords
 * and never calls into this file; see quickfind.js's header comment
 * for why that split exists.
 *
 * Deliberately local/deterministic — no fuzzy-match library, no LLM.
 * See docs/app-development-guide.md, "Declaring actions", for the
 * meta.json shape this reads (name/keywords/actions[].aliases, plus
 * the optional "intents" list).
 *
 * Pipeline (conceptually):
 *   normalize -> tokenize -> alias/keyword/intent match -> fuzzy
 *   fallback -> score -> rank -> confidence tier
 *
 * Exposes window.WorkshopResolver = {
 *   normalize, tokenize, scoreAction, scoreApp, resolve, suggestions,
 *   didYouMean, parseMathExpression, parseConversionQuery
 * }
 */
(function () {
  const STOPWORDS = new Set([
    'to', 'from', 'into', 'the', 'a', 'an', 'and', 'or', 'otherwise', 'of',
    'for', 'please', 'convert', 'make', 'turn', 'change', 'my', 'me', 'i',
    'want', 'need', 'can', 'you', 'open', 'do', 'get', 'this', 'that'
  ]);

  // Common "X2Y" shorthand (jpg2jpeg, png2webp) -> "x to y" so it scores
  // exactly like the spelled-out phrase. Only fires between two short
  // alpha runs so it doesn't mangle ordinary words containing digits.
  function expandShorthand(s) {
    return s.replace(/\b([a-z]{2,8})2([a-z]{2,8})\b/g, '$1 to $2');
  }

  function normalize(raw) {
    let s = String(raw == null ? '' : raw).toLowerCase().trim();
    s = s.replace(/[_\-\/]+/g, ' ');      // jpg-to-jpeg, jpg_to_jpeg, jpg/jpeg -> spaces
    s = expandShorthand(s);
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function tokenize(raw) {
    return normalize(raw)
      .split(/[^a-z0-9]+/)
      .filter(function (t) { return t.length > 1 && !STOPWORDS.has(t); });
  }

  function scoreAction(action, qRaw) {
    const q = normalize(qRaw);
    if (!q) return -1;
    const qStripped = tokenize(q).join(' ');
    const label = action.label.toLowerCase();
    const aliasText = (action.aliases || []).join(' ');
    if (label === q || (qStripped && label === qStripped)) return 200;
    if (label.startsWith(q)) return 150;
    if (qStripped && label.startsWith(qStripped)) return 140;
    if (aliasText.includes(q)) return 120;
    if (qStripped && aliasText.includes(qStripped)) return 110;
    if (q.includes(label) && label.length > 2) return 90;

    const qTokens = tokenize(q);
    if (!qTokens.length) return -1;
    const aliasTokens = tokenize(aliasText);
    const aliasTokenSet = {};
    aliasTokens.forEach(function (t) { aliasTokenSet[t] = true; });
    let hits = 0;
    qTokens.forEach(function (t) { if (aliasTokenSet[t]) hits++; });
    if (hits === 0 || hits / qTokens.length < 0.5) return -1;
    return 30 + hits * 10;
  }

  function scoreApp(app, qRaw) {
    const q = normalize(qRaw);
    if (!q) return -1;
    const qStripped = tokenize(q).join(' ');
    const name = app.name.toLowerCase();
    const folder = app.folder.toLowerCase();
    const keywords = (app.keywords || []).join(' ').toLowerCase();
    const intents = (app.intents || []).join(' ').toLowerCase().replace(/_/g, ' ');
    const category = app.category.toLowerCase();
    const desc = app.description.toLowerCase();
    if (name === q || (qStripped && name === qStripped)) return 220;
    if (name.startsWith(q)) return 100;
    if (qStripped && name.startsWith(qStripped)) return 95;
    if (name.includes(q)) return 80;
    if (qStripped && name.includes(qStripped)) return 75;
    if (folder.includes(q)) return 70;
    if (keywords.includes(q)) return 60;
    if (intents.includes(q)) return 55;
    if (category.includes(q)) return 40;
    if (desc.includes(q)) return 20;

    // Word-overlap fallback so multi-word queries like "convert my photos"
    // still find an app whose keywords are single words ("image", "photo").
    const qTokens = tokenize(q);
    if (!qTokens.length) return -1;
    const bagTokens = tokenize(name + ' ' + keywords + ' ' + intents + ' ' + category);
    const bagSet = {};
    bagTokens.forEach(function (t) { bagSet[t] = true; });
    let hits = 0;
    qTokens.forEach(function (t) { if (bagSet[t]) hits++; });
    if (hits === 0 || hits / qTokens.length < 0.5) return -1;
    return 10 + hits * 8;
  }

  // Very small edit-distance-ish closeness check used only for the
  // "Did you mean" nudge on a near-miss single app name — not used for
  // ranking real matches.
  function levenshtein(a, b) {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (!al) return bl;
    if (!bl) return al;
    const row = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) row[j] = j;
    for (let i = 1; i <= al; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= bl; j++) {
        const tmp = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return row[bl];
  }

  function didYouMean(apps, qRaw) {
    const q = normalize(qRaw);
    if (!q || q.length < 3) return null;
    let best = null, bestDist = Infinity;
    apps.forEach(function (app) {
      const name = app.name.toLowerCase();
      const dist = levenshtein(q, name);
      const threshold = Math.max(1, Math.floor(name.length * 0.4));
      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        best = app;
      }
    });
    return best;
  }

  // A handful of example queries to show as "Try:" chips when nothing
  // resolves — pulled from real actions/apps rather than hardcoded app
  // names, so it stays accurate as apps are added/removed.
  function suggestions(apps, limit) {
    limit = limit || 5;
    const pool = [];
    apps.forEach(function (app) {
      if (app.state !== 'ready') return;
      (app.actions || []).slice(0, 1).forEach(function (action) {
        const alias = (action.aliases || [])[0] || action.label.toLowerCase();
        pool.push(alias);
      });
      if (!(app.actions || []).length) pool.push(app.name.toLowerCase());
    });
    // stable shuffle-ish spread: take every Nth so results vary by app, not just first few
    const out = [];
    const step = Math.max(1, Math.floor(pool.length / limit));
    for (let i = 0; i < pool.length && out.length < limit; i += step) out.push(pool[i]);
    return out.length ? out : pool.slice(0, limit);
  }

  // ---- Phase 5: deep action parameters -------------------------------
  // Some intents are better answered by computing/parsing the query
  // itself than by matching declared aliases — "25% of 480", "12 * 8",
  // "avif to bmp". These stay data-driven: the math path only fires for
  // an app that opts in via meta.json intents ("calculate_expression" /
  // "do_math" — see docs/app-development-guide.md), and the conversion
  // path generalizes whatever "?to=<format>" actions an app already
  // declares rather than hardcoding Image Converter by name, so it also
  // covers format pairs no single alias spells out (e.g. "avif to bmp").

  const EXT_EQUIV = { jpg: ['jpg', 'jpeg'], jpeg: ['jpg', 'jpeg'] };
  function extMatches(target, actual) {
    target = target.toLowerCase();
    actual = actual.toLowerCase();
    if (target === actual) return true;
    return (EXT_EQUIV[target] || [target]).indexOf(actual) !== -1;
  }

  function parseConversionQuery(qRaw) {
    const s = normalize(qRaw);
    const m = s.match(/(?:^|\bconvert\s+)([a-z0-9]{2,6})\s+to\s+([a-z0-9]{2,6})\b/);
    if (!m) return null;
    return { from: m[1], to: m[2] };
  }

  function niceNumber(n) {
    const rounded = Math.round(n * 1e10) / 1e10;
    return rounded.toString();
  }

  function parseMathExpression(qRaw) {
    let s = normalize(qRaw);
    s = s.replace(/^(calculate|compute|solve|what is|whats|what's)\s+/, '').trim();

    const pctOf = s.match(/^(-?\d+(?:\.\d+)?)\s*%\s*of\s+(-?\d+(?:\.\d+)?)$/);
    if (pctOf) {
      const pct = parseFloat(pctOf[1]);
      const base = parseFloat(pctOf[2]);
      const value = (pct / 100) * base;
      return { display: pctOf[0], mathExpr: '(' + pct + '/100)*' + base, value: value };
    }

    // Generic arithmetic: whitelist characters only (no letters at all,
    // so this can never reach identifiers/function calls), require at
    // least one operator and one digit so a bare number isn't treated
    // as a "task".
    if (/^[0-9.\s+\-*/^()%]+$/.test(s) && /[+\-*/^%]/.test(s) && /\d/.test(s)) {
      const jsExpr = s.replace(/\^/g, '**');
      let value = null;
      try {
        // Safe: jsExpr is whitelisted to digits/operators/parens above,
        // so this can't execute arbitrary code.
        value = Function('"use strict"; return (' + jsExpr + ')')();
      } catch (e) { value = null; }
      if (typeof value === 'number' && isFinite(value)) {
        return { display: s, mathExpr: s, value: value };
      }
    }
    return null;
  }

  function addDynamicMatches(apps, q, actionMatches) {
    const math = parseMathExpression(q);
    if (math) {
      const calcApp = apps.find(function (a) {
        return (a.intents || []).indexOf('calculate_expression') !== -1 ||
               (a.intents || []).indexOf('do_math') !== -1;
      });
      if (calcApp) {
        actionMatches.unshift({
          app: calcApp,
          action: {
            label: 'Calculate: ' + math.display + ' = ' + niceNumber(math.value),
            aliases: [],
            path: '?expr=' + encodeURIComponent(math.mathExpr),
            dynamic: true
          },
          s: 999
        });
      }
    }

    const conv = parseConversionQuery(q);
    if (conv) {
      apps.forEach(function (app) {
        (app.actions || []).forEach(function (action) {
          const m = /[?&]to=([a-z0-9]+)/i.exec(action.path || '');
          if (m && extMatches(conv.to, m[1])) {
            const already = actionMatches.find(function (x) { return x.app === app && x.action === action; });
            if (already) { already.s = Math.max(already.s, 180); }
            else actionMatches.push({ app: app, action: action, s: 180 });
          }
        });
      });
    }
  }

  // Resolve a query into grouped, ranked matches plus a confidence tier:
  //   'high'     — a single very strong match (safe to jump straight to it)
  //   'moderate' — a handful of plausible candidates
  //   'low'      — nothing crossed the bar to auto-suggest confidently
  //   'empty'    — blank query
  function resolve(apps, qRaw) {
    const q = normalize(qRaw);
    if (!q) return { tier: 'empty', actionMatches: [], toolMatches: [], query: qRaw };

    const actionMatches = [];
    apps.forEach(function (app) {
      (app.actions || []).forEach(function (action) {
        const s = scoreAction(action, q);
        if (s >= 0) actionMatches.push({ app: app, action: action, s: s });
      });
    });
    addDynamicMatches(apps, q, actionMatches);
    actionMatches.sort(function (x, y) { return y.s - x.s; });

    const toolMatches = apps
      .map(function (a) { return { app: a, s: scoreApp(a, q) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (x, y) { return y.s - x.s; });

    let tier = 'low';
    const topScore = Math.max(
      actionMatches.length ? actionMatches[0].s : -1,
      toolMatches.length ? toolMatches[0].s : -1
    );
    const totalCandidates = actionMatches.length + toolMatches.length;

    if (topScore >= 120) {
      tier = 'high';
    } else if (topScore >= 40 && totalCandidates > 0) {
      tier = 'moderate';
    } else if (totalCandidates > 0) {
      tier = 'low';
    } else {
      tier = 'none';
    }

    return { tier: tier, actionMatches: actionMatches, toolMatches: toolMatches, query: qRaw };
  }

  window.WorkshopResolver = {
    normalize: normalize,
    tokenize: tokenize,
    scoreAction: scoreAction,
    scoreApp: scoreApp,
    resolve: resolve,
    suggestions: suggestions,
    didYouMean: didYouMean,
    parseMathExpression: parseMathExpression,
    parseConversionQuery: parseConversionQuery
  };
})();
