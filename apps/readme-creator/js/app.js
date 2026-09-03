(function () {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */
  let features = ["Fast to set up", "Zero configuration required"];
  let stack = ["JavaScript"];

  const TEMPLATE = {
    name: "Sylhet Institution Locator",
    tagline: "Looks up coordinates for government institutions across Sylhet division.",
    repo: "yourname/institution-locator",
    description:
      "A small automation tool that reads per-upazila spreadsheets and resolves each institution's coordinates, with resilience for messy Bengali-language source data.",
    installLang: "bash",
    install: "git clone https://github.com/yourname/institution-locator.git\ncd institution-locator\nnpm install",
    usageLang: "bash",
    usage: "npm start -- --upazila sylhet-sadar",
    features: [
      "Handles Bengali column headers automatically",
      "Resumes from the last completed row",
      "Validates coordinates against a Sylhet bounding box",
    ],
    stack: ["Node.js", "Playwright", "Excel (xlsx)"],
    contributing:
      "Open an issue first to discuss what you'd like to change, then submit a pull request.",
    license: "MIT",
    author: "",
    contact: "",
  };

  /* ---------------------------------------------------------------- */
  /* Helpers                                                            */
  /* ---------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const val = (id) => $(id).value;

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  function fence(lang, body) {
    return "```" + lang + "\n" + body + "\n```";
  }

  /* ---------------------------------------------------------------- */
  /* Markdown generation                                                */
  /* ---------------------------------------------------------------- */
  function generateMarkdown() {
    const name = val("f-name").trim() || "Project Name";
    const tagline = val("f-tagline").trim();
    const license = val("f-license");
    const description = val("f-description").trim();
    const install = val("f-install").trim();
    const installLang = val("f-install-lang");
    const usage = val("f-usage").trim();
    const usageLang = val("f-usage-lang");
    const contributing = val("f-contributing").trim();
    const author = val("f-author").trim();
    const contact = val("f-contact").trim();
    const includeToc = $("f-toc").checked;

    const lines = [`# ${name}`];
    if (tagline) lines.push("", tagline);

    const badges = [];
    if ($("f-badge-license").checked && license !== "none") {
      badges.push(
        `![License](https://img.shields.io/badge/license-${encodeURIComponent(license)}-blue.svg)`
      );
    }
    if ($("f-badge-version").checked) {
      badges.push("![Version](https://img.shields.io/badge/version-1.0.0-informational.svg)");
    }
    if ($("f-badge-build").checked) {
      badges.push("![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)");
    }
    if ($("f-badge-pr").checked) {
      badges.push("![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)");
    }
    if (badges.length) lines.push("", badges.join(" "));

    const sections = [];
    if (description) sections.push({ title: "Overview", body: description });
    if (install) sections.push({ title: "Installation", body: fence(installLang, install) });
    if (usage) sections.push({ title: "Usage", body: fence(usageLang, usage) });
    if (features.length)
      sections.push({ title: "Features", body: features.map((f) => `- ${f}`).join("\n") });
    if (stack.length)
      sections.push({ title: "Tech Stack", body: stack.map((s) => `- ${s}`).join("\n") });
    if (contributing) sections.push({ title: "Contributing", body: contributing });
    if (license !== "none")
      sections.push({
        title: "License",
        body: `This project is licensed under the ${license} license.`,
      });
    if (author || contact)
      sections.push({ title: "Contact", body: [author, contact].filter(Boolean).join(" — ") });

    if (includeToc && sections.length > 1) {
      lines.push("", "## Table of Contents", "");
      sections.forEach((s) => lines.push(`- [${s.title}](#${slugify(s.title)})`));
    }

    sections.forEach((s) => {
      lines.push("", `## ${s.title}`, "", s.body);
    });

    return lines.join("\n") + "\n";
  }

  /* ---------------------------------------------------------------- */
  /* Chip lists (features / tech stack)                                 */
  /* ---------------------------------------------------------------- */
  function renderChips(listEl, items, onRemove) {
    listEl.innerHTML = "";
    items.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "chip";
      const span = document.createElement("span");
      span.textContent = item;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `Remove ${item}`);
      btn.textContent = "×";
      btn.addEventListener("click", () => onRemove(i));
      li.appendChild(span);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function refreshChips() {
    renderChips($("featureList"), features, (i) => {
      features.splice(i, 1);
      refreshChips();
      update();
    });
    renderChips($("stackList"), stack, (i) => {
      stack.splice(i, 1);
      refreshChips();
      update();
    });
  }

  function wireAdder(inputId, buttonId, arr) {
    const input = $(inputId);
    const commit = () => {
      const v = input.value.trim();
      if (!v) return;
      arr.push(v);
      input.value = "";
      refreshChips();
      update();
      input.focus();
    };
    $(buttonId).addEventListener("click", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Preview rendering                                                  */
  /* ---------------------------------------------------------------- */
  function update() {
    const md = generateMarkdown();
    $("rawCode").textContent = md;

    if (window.marked) {
      $("renderedView").innerHTML = window.marked.parse(md);
    } else {
      $("renderedView").textContent = md;
    }

    const words = md.trim().split(/\s+/).filter(Boolean).length;
    const headings = (md.match(/^#{1,3}\s/gm) || []).length;
    $("previewStats").textContent = `${words} words · ${headings} headings`;
  }

  /* ---------------------------------------------------------------- */
  /* Tabs                                                               */
  /* ---------------------------------------------------------------- */
  function wireTabs() {
    const tabRendered = $("tabRendered");
    const tabRaw = $("tabRaw");
    const renderedView = $("renderedView");
    const rawView = $("rawView");

    function show(rendered) {
      tabRendered.classList.toggle("active", rendered);
      tabRaw.classList.toggle("active", !rendered);
      tabRendered.setAttribute("aria-selected", String(rendered));
      tabRaw.setAttribute("aria-selected", String(!rendered));
      renderedView.hidden = !rendered;
      rawView.hidden = rendered;
    }

    tabRendered.addEventListener("click", () => show(true));
    tabRaw.addEventListener("click", () => show(false));
  }

  /* ---------------------------------------------------------------- */
  /* Copy / download                                                    */
  /* ---------------------------------------------------------------- */
  function flash(message) {
    const el = $("copyFlash");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copyMarkdown() {
    const md = generateMarkdown();
    navigator.clipboard
      .writeText(md)
      .then(() => flash("Copied to clipboard."))
      .catch(() => flash("Couldn't copy — select and copy manually."));
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash("Downloaded README.md");
  }

  /* ---------------------------------------------------------------- */
  /* Reset / template                                                   */
  /* ---------------------------------------------------------------- */
  function resetForm() {
    $("f-name").value = "";
    $("f-tagline").value = "";
    $("f-repo").value = "";
    $("f-description").value = "";
    $("f-install").value = "";
    $("f-usage").value = "";
    $("f-contributing").value = "";
    $("f-author").value = "";
    $("f-contact").value = "";
    $("f-install-lang").value = "bash";
    $("f-usage-lang").value = "bash";
    $("f-license").value = "MIT";
    $("f-toc").checked = true;
    $("f-badge-license").checked = true;
    $("f-badge-version").checked = false;
    $("f-badge-build").checked = false;
    $("f-badge-pr").checked = false;
    features = [];
    stack = [];
    refreshChips();
    update();
    $("f-name").focus();
  }

  function loadTemplate() {
    $("f-name").value = TEMPLATE.name;
    $("f-tagline").value = TEMPLATE.tagline;
    $("f-repo").value = TEMPLATE.repo;
    $("f-description").value = TEMPLATE.description;
    $("f-install-lang").value = TEMPLATE.installLang;
    $("f-install").value = TEMPLATE.install;
    $("f-usage-lang").value = TEMPLATE.usageLang;
    $("f-usage").value = TEMPLATE.usage;
    $("f-contributing").value = TEMPLATE.contributing;
    $("f-license").value = TEMPLATE.license;
    $("f-author").value = TEMPLATE.author;
    $("f-contact").value = TEMPLATE.contact;
    $("f-badge-license").checked = true;
    features = TEMPLATE.features.slice();
    stack = TEMPLATE.stack.slice();
    refreshChips();
    update();
  }

  /* ---------------------------------------------------------------- */
  /* Theme toggle (design-system.md §5, §7)                             */
  /* ---------------------------------------------------------------- */
  function applyTheme(theme, animate) {
    const toggle = $("themeToggle");
    const state = $("themeState");
    const flood = $("lightFlood");

    const setIt = () => {
      document.documentElement.setAttribute("data-theme", theme);
      toggle.setAttribute("aria-checked", String(theme === "night"));
      state.textContent = theme === "night" ? "Night" : "Day";
      localStorage.setItem("workshop-theme", theme);
    };

    if (!animate) {
      setIt();
      return;
    }

    const rect = toggle.getBoundingClientRect();
    flood.style.setProperty("--flood-x", `${rect.left + rect.width / 2}px`);
    flood.style.setProperty("--flood-y", `${rect.top + rect.height / 2}px`);
    flood.classList.add("flooding");
    setTimeout(setIt, 320);
    setTimeout(() => flood.classList.remove("flooding"), 700);
  }

  function wireThemeToggle() {
    const saved = localStorage.getItem("workshop-theme") || "day";
    applyTheme(saved, false);

    $("themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "night" ? "night" : "day";
      applyTheme(current === "night" ? "day" : "night", true);
    });

    window.addEventListener("storage", (e) => {
      if (e.key === "workshop-theme" && e.newValue) applyTheme(e.newValue, false);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Palette action handling (app-development-guide.md §6)              */
  /* ---------------------------------------------------------------- */
  function handleActionParams() {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "new") {
      resetForm();
    } else if (mode === "template") {
      loadTemplate();
    } else if (mode === "download") {
      update();
      downloadMarkdown();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                               */
  /* ---------------------------------------------------------------- */
  function init() {
    wireThemeToggle();
    wireTabs();
    refreshChips();

    document
      .getElementById("readmeForm")
      .addEventListener("input", update);
    document
      .getElementById("readmeForm")
      .addEventListener("change", update);

    wireAdder("f-feature-input", "addFeatureBtn", features);
    wireAdder("f-stack-input", "addStackBtn", stack);

    $("resetBtn").addEventListener("click", resetForm);
    $("templateBtn").addEventListener("click", loadTemplate);
    $("copyBtn").addEventListener("click", copyMarkdown);
    $("downloadBtn").addEventListener("click", downloadMarkdown);

    update();
    handleActionParams();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
