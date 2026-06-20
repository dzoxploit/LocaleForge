const STORAGE_KEY = "localeforge:mvp";

const SAMPLE_LOCALES = {
  en: {
    login: {
      title: "Welcome",
      subtitle: "Sign in to continue",
      button: "Login",
    },
    dashboard: {
      greeting: "Good morning",
      stats: {
        users: "Users",
        revenue: "Revenue",
      },
    },
    settings: {
      language: "Language",
      timezone: "Timezone",
    },
    billing: {
      title: "Billing",
      invoices: "Invoices",
    },
  },
  id: {
    login: {
      title: "Selamat Datang",
      subtitle: "Masuk untuk melanjutkan",
    },
    dashboard: {
      greeting: "Selamat pagi",
      stats: {
        users: "Pengguna",
      },
    },
    settings: "Pengaturan",
  },
  es: {
    login: {
      title: "Bienvenido",
      button: "Iniciar sesion",
    },
    dashboard: {
      greeting: "Buenos dias",
      stats: {
        users: "Usuarios",
        revenue: "Ingresos",
      },
    },
    settings: {
      language: "Idioma",
      timezone: "Zona horaria",
    },
    legacy: {
      cta: "Antiguo",
    },
  },
};

const SAMPLE_REFERENCES = `import { useTranslations } from "next-intl";

export function LoginPanel() {
  const t = useTranslations();

  return (
    <section>
      <h1>{t("login.title")}</h1>
      <p>{t("login.subtitle")}</p>
      <button>{t("login.button")}</button>
      <span>{t("dashboard.stats.users")}</span>
      <strong>{t("settings.language")}</strong>
    </section>
  );
}

i18n.t("dashboard.greeting");
formatMessage({ id: "settings.timezone" });`;

const PHRASEBOOK = {
  id: {
    Welcome: "Selamat Datang",
    "Sign in to continue": "Masuk untuk melanjutkan",
    Login: "Masuk",
    "Good morning": "Selamat pagi",
    Users: "Pengguna",
    Revenue: "Pendapatan",
    Language: "Bahasa",
    Timezone: "Zona waktu",
    Billing: "Penagihan",
    Invoices: "Faktur",
  },
  es: {
    Welcome: "Bienvenido",
    "Sign in to continue": "Inicia sesion para continuar",
    Login: "Iniciar sesion",
    "Good morning": "Buenos dias",
    Users: "Usuarios",
    Revenue: "Ingresos",
    Language: "Idioma",
    Timezone: "Zona horaria",
    Billing: "Facturacion",
    Invoices: "Facturas",
  },
  fr: {
    Welcome: "Bienvenue",
    "Sign in to continue": "Connectez-vous pour continuer",
    Login: "Connexion",
    "Good morning": "Bonjour",
    Users: "Utilisateurs",
    Revenue: "Revenu",
    Language: "Langue",
    Timezone: "Fuseau horaire",
    Billing: "Facturation",
    Invoices: "Factures",
  },
};

const state = {
  locales: structuredClone(SAMPLE_LOCALES),
  sourceLocale: "en",
  references: SAMPLE_REFERENCES,
  activeTab: "missing",
  analysis: null,
};

const elements = {
  autosaveStatus: document.querySelector("#autosaveStatus"),
  metricLocales: document.querySelector("#metricLocales"),
  metricSource: document.querySelector("#metricSource"),
  metricKeys: document.querySelector("#metricKeys"),
  metricDepth: document.querySelector("#metricDepth"),
  metricMissing: document.querySelector("#metricMissing"),
  metricUnused: document.querySelector("#metricUnused"),
  metricReferences: document.querySelector("#metricReferences"),
  metricExtras: document.querySelector("#metricExtras"),
  metricComplete: document.querySelector("#metricComplete"),
  sourceLocaleSelect: document.querySelector("#sourceLocaleSelect"),
  localeCodeInput: document.querySelector("#localeCodeInput"),
  localeJsonInput: document.querySelector("#localeJsonInput"),
  sourceInput: document.querySelector("#sourceInput"),
  localeList: document.querySelector("#localeList"),
  fillMissingButton: document.querySelector("#fillMissingButton"),
  referenceStats: document.querySelector("#referenceStats"),
  reportTitle: document.querySelector("#reportTitle"),
  reportContent: document.querySelector("#reportContent"),
  toast: document.querySelector("#toast"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (!cached) return;

  try {
    const parsed = JSON.parse(cached);
    if (!parsed.locales || typeof parsed.locales !== "object") return;
    state.locales = parsed.locales;
    state.sourceLocale =
      parsed.sourceLocale || Object.keys(parsed.locales)[0] || "en";
    state.references = parsed.references || "";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      locales: state.locales,
      sourceLocale: state.sourceLocale,
      references: state.references,
    }),
  );
  elements.autosaveStatus.textContent = "Saved";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function flattenLeaves(value, prefix = "", output = {}) {
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length && prefix) output[prefix] = {};
    for (const [key, child] of entries) {
      flattenLeaves(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  if (prefix) output[prefix] = value;
  return output;
}

function collectTypes(value, prefix = "", output = {}) {
  if (prefix) output[prefix] = typeOf(value);
  if (!isObject(value)) return output;

  for (const [key, child] of Object.entries(value)) {
    collectTypes(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function maxDepth(keys) {
  if (!keys.length) return 0;
  return Math.max(...keys.map((key) => key.split(".").length));
}

function sortKeys(keys) {
  return [...keys].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

function firstValueForKey(key, leavesByLocale) {
  for (const [locale, leaves] of Object.entries(leavesByLocale)) {
    if (Object.prototype.hasOwnProperty.call(leaves, key)) {
      return { locale, value: leaves[key] };
    }
  }
  return { locale: "", value: "" };
}

function stringifyValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function suggestTranslation(locale, sourceValue) {
  const text = stringifyValue(sourceValue);
  const direct = PHRASEBOOK[locale]?.[text];
  if (direct) return direct;
  if (!text || text === "{}") return "";
  return `${text} [${locale}]`;
}

function setNestedValue(object, path, value) {
  const segments = path.split(".");
  let current = object;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!isObject(current[segment])) current[segment] = {};
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function fillMissingTranslations() {
  if (!state.analysis) {
    showToast("Run analysis first.");
    return;
  }

  const missingIssues = state.analysis.missing;
  if (!missingIssues.length) {
    showToast("No missing translations to fill.");
    return;
  }

  for (const issue of missingIssues) {
    const localeData = state.locales[issue.locale];
    if (!localeData) continue;

    const value = issue.suggestion || issue.sourceValue;
    setNestedValue(localeData, issue.key, value);
  }

  saveState();
  render();
  showToast("Missing translations auto-filled.");
}

function downloadLocale(locale) {
  const content = state.locales[locale];
  if (!content) {
    showToast(`Locale ${locale} not found.`);
    return;
  }

  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${locale}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`${locale}.json downloaded.`);
}

function extractReferences(sourceText) {
  const references = new Set();
  const patterns = [
    /\b(?:t|translate|\$t)\(\s*["'`]([A-Za-z0-9_.:-]+)["'`]\s*\)/g,
    /\bi18n\.t\(\s*["'`]([A-Za-z0-9_.:-]+)["'`]\s*\)/g,
    /\bformatMessage\(\s*\{\s*id:\s*["'`]([A-Za-z0-9_.:-]+)["'`]/g,
    /\bintl\.formatMessage\(\s*\{\s*id:\s*["'`]([A-Za-z0-9_.:-]+)["'`]/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(sourceText);
    while (match) {
      references.add(match[1]);
      match = pattern.exec(sourceText);
    }
  }
  return references;
}

function analyzeLocales() {
  const localeCodes = Object.keys(state.locales);
  const leavesByLocale = {};
  const typesByLocale = {};

  for (const locale of localeCodes) {
    leavesByLocale[locale] = flattenLeaves(state.locales[locale]);
    typesByLocale[locale] = collectTypes(state.locales[locale]);
  }

  const allKeys = sortKeys(
    new Set(
      localeCodes.flatMap((locale) => Object.keys(leavesByLocale[locale])),
    ),
  );
  const allPaths = sortKeys(
    new Set(
      localeCodes.flatMap((locale) => Object.keys(typesByLocale[locale])),
    ),
  );
  const sourceLeaves = leavesByLocale[state.sourceLocale] || {};
  const { references, counts: referenceCounts } = extractReferences(
    state.references,
  );
  const missing = [];
  const structure = [];
  const extras = [];

  for (const locale of localeCodes) {
    for (const key of allKeys) {
      if (!Object.prototype.hasOwnProperty.call(leavesByLocale[locale], key)) {
        const source = Object.prototype.hasOwnProperty.call(sourceLeaves, key)
          ? { locale: state.sourceLocale, value: sourceLeaves[key] }
          : firstValueForKey(key, leavesByLocale);

        missing.push({
          locale,
          key,
          sourceLocale: source.locale,
          sourceValue: source.value,
          suggestion: suggestTranslation(locale, source.value),
          severity: locale === state.sourceLocale ? "warning" : "critical",
        });
      }
    }
  }

  for (const path of allPaths) {
    const presentTypes = localeCodes
      .map((locale) => ({ locale, type: typesByLocale[locale][path] }))
      .filter((entry) => entry.type);
    const uniqueTypes = new Set(presentTypes.map((entry) => entry.type));

    if (uniqueTypes.size > 1) {
      structure.push({
        path,
        expected:
          typesByLocale[state.sourceLocale][path] || [...uniqueTypes][0],
        locales: presentTypes,
      });
    }
  }

  for (const locale of localeCodes) {
    if (locale === state.sourceLocale) continue;
    for (const key of Object.keys(leavesByLocale[locale])) {
      if (!Object.prototype.hasOwnProperty.call(sourceLeaves, key)) {
        extras.push({ locale, key });
      }
    }
  }

  const unused =
    references.size === 0
      ? []
      : sortKeys(Object.keys(sourceLeaves))
          .filter((key) => !references.has(key))
          .map((key) => ({
            locale: state.sourceLocale,
            key,
            value: sourceLeaves[key],
          }));

  const referenceCountsMap = referenceCounts;
  const topReferences = sortKeys(Object.keys(referenceCountsMap))
    .sort((a, b) => referenceCountsMap[b] - referenceCountsMap[a])
    .slice(0, 5)
    .map((key) => ({ key, count: referenceCountsMap[key] }));

  const completeness = {};
  for (const locale of localeCodes) {
    const translated = allKeys.filter((key) =>
      Object.prototype.hasOwnProperty.call(leavesByLocale[locale], key),
    ).length;
    completeness[locale] = allKeys.length
      ? Math.round((translated / allKeys.length) * 100)
      : 100;
  }

  const averageComplete = localeCodes.length
    ? Math.round(
        localeCodes.reduce((sum, locale) => sum + completeness[locale], 0) /
          localeCodes.length,
      )
    : 0;

  return {
    localeCodes,
    leavesByLocale,
    typesByLocale,
    allKeys,
    allPaths,
    missing,
    structure,
    unused,
    references,
    referenceCounts: referenceCountsMap,
    topReferences,
    extras,
    extraCount: extras.length,
    completeness,
    averageComplete,
    depth: maxDepth(allKeys),
    generatedAt: new Date().toISOString(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  state.analysis = analyzeLocales();
  renderSummary();
  renderLocaleControls();
  renderReferences();
  renderReport();
}

function renderSummary() {
  const analysis = state.analysis;
  elements.metricLocales.textContent = analysis.localeCodes.length;
  elements.metricSource.textContent = `Source: ${state.sourceLocale}`;
  elements.metricKeys.textContent = analysis.allKeys.length;
  elements.metricDepth.textContent = `Depth: ${analysis.depth}`;
  elements.metricMissing.textContent = analysis.missing.length;
  elements.metricUnused.textContent = analysis.unused.length;
  elements.metricReferences.textContent = analysis.references.size;
  elements.metricExtras.textContent = analysis.extraCount;
  elements.metricComplete.textContent = `${analysis.averageComplete}%`;
}

function renderLocaleControls() {
  const analysis = state.analysis;
  elements.sourceLocaleSelect.innerHTML = analysis.localeCodes
    .map(
      (locale) =>
        `<option value="${escapeHtml(locale)}" ${locale === state.sourceLocale ? "selected" : ""}>${escapeHtml(
          locale,
        )}</option>`,
    )
    .join("");

  elements.localeList.innerHTML = analysis.localeCodes
    .map((locale) => {
      const keyCount = Object.keys(analysis.leavesByLocale[locale]).length;
      const missingCount = analysis.missing.filter(
        (issue) => issue.locale === locale,
      ).length;
      const complete = analysis.completeness[locale];
      const statusClass = missingCount ? "danger-dot" : "ok-dot";
      const removeDisabled = analysis.localeCodes.length <= 1 ? "disabled" : "";

      return `
        <article class="locale-row">
          <div>
            <strong><span class="${statusClass}"></span>${escapeHtml(locale)}</strong>
            <small>${keyCount} keys / ${complete}% complete / ${missingCount} missing</small>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-fill" style="width: ${complete}%"></div>
            </div>
          </div>
          <div class="locale-actions">
            <button class="tiny-button" type="button" title="Load ${escapeHtml(
              locale,
            )}" data-action="load-locale" data-locale="${escapeHtml(locale)}">
              <svg><use href="#icon-code"></use></svg>
            </button>
            <button class="tiny-button" type="button" title="Download ${escapeHtml(
              locale,
            )} locale" data-action="download-locale" data-locale="${escapeHtml(locale)}">
              <svg><use href="#icon-download"></use></svg>
            </button>
            <button class="tiny-button" type="button" title="Remove ${escapeHtml(
              locale,
            )}" data-action="remove-locale" data-locale="${escapeHtml(locale)}" ${removeDisabled}>
              <svg><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderReferences() {
  const analysis = state.analysis;
  elements.sourceInput.value = state.references;
  const sourceKeyCount = Object.keys(
    analysis.leavesByLocale[state.sourceLocale] || {},
  ).length;
  const occurrenceCount = Object.values(analysis.referenceCounts).reduce(
    (sum, value) => sum + value,
    0,
  );
  const topReferencesMarkup = analysis.topReferences.length
    ? `<div class="reference-top">
         <strong>Top references</strong>
         ${analysis.topReferences
           .map(
             (entry) =>
               `<code>${escapeHtml(entry.key)} (${entry.count})</code>`,
           )
           .join("")}
       </div>`
    : "";

  elements.referenceStats.innerHTML =
    [
      ["Referenced", analysis.references.size],
      ["Occurrences", occurrenceCount],
      ["Source keys", sourceKeyCount],
      ["Unused", analysis.unused.length],
      ["Extra", analysis.extraCount],
    ]
      .map(
        ([label, value]) => `
        <div class="reference-stat">
          <strong>${value}</strong>
          <span>${label}</span>
        </div>
      `,
      )
      .join("") + topReferencesMarkup;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === state.activeTab);
    tab.setAttribute(
      "aria-selected",
      String(tab.dataset.tab === state.activeTab),
    );
  });

  if (state.activeTab === "missing") renderMissingReport();
  if (state.activeTab === "structure") renderStructureReport();
  if (state.activeTab === "unused") renderUnusedReport();
}

function emptyState(title, detail) {
  return `
    <div class="empty-state">
      <div>
        <svg><use href="#icon-check"></use></svg>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </div>
  `;
}

function renderMissingReport() {
  const issues = state.analysis.missing;
  if (!issues.length) {
    elements.reportContent.innerHTML = emptyState(
      "No missing keys",
      "Every locale contains the same leaf paths.",
    );
    return;
  }

  elements.reportContent.innerHTML = `
    <div class="issue-list">
      ${issues
        .map(
          (issue) => `
            <article class="issue-row">
              <div class="issue-main">
                <strong><code>${escapeHtml(issue.key)}</code></strong>
                <div class="issue-meta">
                  <span class="${issue.severity}">${escapeHtml(issue.severity)}</span>
                  <span>locale ${escapeHtml(issue.locale)}</span>
                  <span>source ${escapeHtml(issue.sourceLocale)}</span>
                </div>
              </div>
              <div class="suggestion">
                <strong>Draft value</strong>
                <code>${escapeHtml(issue.suggestion || stringifyValue(issue.sourceValue))}</code>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderStructureReport() {
  const issues = state.analysis.structure;
  if (!issues.length) {
    elements.reportContent.innerHTML = emptyState(
      "Schemas match",
      "Locale files share compatible nested structures.",
    );
    return;
  }

  elements.reportContent.innerHTML = `
    <div class="issue-list">
      ${issues
        .map(
          (issue) => `
            <article class="issue-row">
              <div class="issue-main">
                <strong><code>${escapeHtml(issue.path)}</code></strong>
                <div class="issue-meta">
                  <span class="warning">expected ${escapeHtml(issue.expected)}</span>
                </div>
              </div>
              <div class="suggestion">
                <strong>Observed types</strong>
                ${issue.locales
                  .map(
                    (entry) =>
                      `<code>${escapeHtml(entry.locale)}: ${escapeHtml(entry.type)}</code>`,
                  )
                  .join(" ")}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderUnusedReport() {
  const issues = state.analysis.unused;
  if (!state.references.trim()) {
    elements.reportContent.innerHTML = emptyState(
      "No source references",
      "Upload or paste application source to scan usage.",
    );
    return;
  }

  if (!issues.length) {
    elements.reportContent.innerHTML = emptyState(
      "No unused keys",
      "Every source-locale key appears in application references.",
    );
    return;
  }

  elements.reportContent.innerHTML = `
    <div class="issue-list">
      ${issues
        .map(
          (issue) => `
            <article class="issue-row">
              <div class="issue-main">
                <strong><code>${escapeHtml(issue.key)}</code></strong>
                <div class="issue-meta">
                  <span class="warning">unused</span>
                  <span>locale ${escapeHtml(issue.locale)}</span>
                </div>
              </div>
              <div class="suggestion">
                <strong>Current value</strong>
                <code>${escapeHtml(stringifyValue(issue.value))}</code>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2600);
}

function normalizeLocaleCode(input) {
  return input.trim().replace(/\s+/g, "-").toLowerCase();
}

function addLocaleFromEditor() {
  const code = normalizeLocaleCode(elements.localeCodeInput.value);
  if (!code) {
    showToast("Enter a locale code.");
    return;
  }

  try {
    const parsed = JSON.parse(elements.localeJsonInput.value);
    if (!isObject(parsed)) {
      showToast("Locale JSON must be an object.");
      return;
    }

    state.locales[code] = parsed;
    if (!state.sourceLocale || !state.locales[state.sourceLocale])
      state.sourceLocale = code;
    saveState();
    render();
    showToast(`${code} locale added.`);
  } catch (error) {
    showToast(`Invalid JSON: ${error.message}`);
  }
}

function resetSample() {
  state.locales = clone(SAMPLE_LOCALES);
  state.sourceLocale = "en";
  state.references = SAMPLE_REFERENCES;
  saveState();
  render();
  showToast("Sample workspace loaded.");
}

function exportReport() {
  const report = {
    sourceLocale: state.sourceLocale,
    locales: state.analysis.localeCodes,
    generatedAt: state.analysis.generatedAt,
    totals: {
      keys: state.analysis.allKeys.length,
      missing: state.analysis.missing.length,
      structure: state.analysis.structure.length,
      unused: state.analysis.unused.length,
      averageComplete: state.analysis.averageComplete,
    },
    missing: state.analysis.missing,
    structure: state.analysis.structure,
    unused: state.analysis.unused,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "localeforge-report.json";
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Report exported.");
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function handleLocaleUpload(event) {
  const files = [...event.target.files];
  if (!files.length) return;

  const failures = [];
  for (const file of files) {
    try {
      const text = await readFile(file);
      const code = normalizeLocaleCode(file.name.replace(/\.json$/i, ""));
      const parsed = JSON.parse(text);
      if (!isObject(parsed)) throw new Error("root is not an object");
      state.locales[code] = parsed;
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }

  if (!state.locales[state.sourceLocale]) {
    state.sourceLocale = Object.keys(state.locales)[0] || "en";
  }

  saveState();
  render();
  event.target.value = "";
  showToast(
    failures.length
      ? failures.join(" | ")
      : `${files.length} locale file(s) loaded.`,
  );
}

async function handleSourceUpload(event) {
  const files = [...event.target.files];
  if (!files.length) return;

  const chunks = [];
  for (const file of files) {
    const text = await readFile(file);
    chunks.push(`// ${file.name}\n${text}`);
  }

  state.references = chunks.join("\n\n");
  saveState();
  render();
  event.target.value = "";
  showToast(`${files.length} source file(s) loaded.`);
}

function bindEvents() {
  document.querySelector("#analyzeButton").addEventListener("click", () => {
    state.references = elements.sourceInput.value;
    saveState();
    render();
    showToast("Scan complete.");
  });

  document
    .querySelector("#exportButton")
    .addEventListener("click", exportReport);
  elements.fillMissingButton.addEventListener("click", fillMissingTranslations);
  document
    .querySelector("#resetSampleButton")
    .addEventListener("click", resetSample);
  document
    .querySelector("#addLocaleButton")
    .addEventListener("click", addLocaleFromEditor);
  document
    .querySelector("#localeFileInput")
    .addEventListener("change", handleLocaleUpload);
  document
    .querySelector("#sourceFileInput")
    .addEventListener("change", handleSourceUpload);

  elements.sourceLocaleSelect.addEventListener("change", (event) => {
    state.sourceLocale = event.target.value;
    saveState();
    render();
  });

  elements.sourceInput.addEventListener("input", () => {
    state.references = elements.sourceInput.value;
    elements.autosaveStatus.textContent = "Editing";
  });

  document
    .querySelector("#loadSampleReferencesButton")
    .addEventListener("click", () => {
      state.references = SAMPLE_REFERENCES;
      saveState();
      render();
      showToast("Sample source loaded.");
    });

  document
    .querySelector("#clearReferencesButton")
    .addEventListener("click", () => {
      state.references = "";
      saveState();
      render();
    });

  document.querySelector(".tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    state.activeTab = tab.dataset.tab;
    renderReport();
  });

  elements.localeList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const locale = button.dataset.locale;

    if (button.dataset.action === "load-locale") {
      elements.localeCodeInput.value = locale;
      elements.localeJsonInput.value = JSON.stringify(
        state.locales[locale],
        null,
        2,
      );
      elements.localeJsonInput.focus();
    }

    if (button.dataset.action === "download-locale") {
      downloadLocale(locale);
      return;
    }

    if (button.dataset.action === "remove-locale") {
      delete state.locales[locale];
      if (state.sourceLocale === locale) {
        state.sourceLocale = Object.keys(state.locales)[0] || "";
      }
      saveState();
      render();
      showToast(`${locale} removed.`);
    }
  });
}

loadState();
bindEvents();
render();
