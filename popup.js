const STORAGE_KEY = "fdmLastReservation";
const OPTIONS_TEMPLATE_KEY = "fdmTemplate";
const OPTIONS_TEMPLATE_HIGH_KEY = "fdmTemplateHigh";
const OPTIONS_THRESHOLD_KEY = "fdmTemplateThreshold";
const OPTIONS_LOCALE_KEY = "fdmLocale";

const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const genBtn = document.getElementById("generate");
const invoiceBtn = document.getElementById("openInvoice");
const resultEl = document.getElementById("result");

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", !!ok);
}

async function loadLastReservation() {
  const data = await chrome.storage.session.get(STORAGE_KEY);
  return data[STORAGE_KEY] || null;
}

var roomsCatalogCache = undefined;

async function getRoomsCatalog() {
  if (roomsCatalogCache !== undefined) return roomsCatalogCache;
  try {
    const url = chrome.runtime.getURL("rooms.json");
    const res = await fetch(url);
    if (!res.ok) {
      roomsCatalogCache = null;
      return null;
    }
    roomsCatalogCache = await res.json();
  } catch (_e) {
    roomsCatalogCache = null;
  }
  return roomsCatalogCache;
}

async function loadTemplateSettings() {
  const raw = await chrome.storage.sync.get({
    [OPTIONS_TEMPLATE_KEY]: FdmTemplate.defaultTemplateStandard(),
    [OPTIONS_TEMPLATE_HIGH_KEY]: FdmTemplate.defaultTemplateHigh(),
    [OPTIONS_THRESHOLD_KEY]: FdmTemplate.DEFAULT_TEMPLATE_THRESHOLD,
    [OPTIONS_LOCALE_KEY]: "uk-UA",
  });
  var threshold = Number(raw[OPTIONS_THRESHOLD_KEY]);
  if (Number.isNaN(threshold) || threshold < 0) {
    threshold = FdmTemplate.DEFAULT_TEMPLATE_THRESHOLD;
  }
  return {
    templateStandard: raw[OPTIONS_TEMPLATE_KEY],
    templateHigh: raw[OPTIONS_TEMPLATE_HIGH_KEY],
    threshold: threshold,
    locale: raw[OPTIONS_LOCALE_KEY] || "uk-UA",
  };
}

async function refresh() {
  const entry = await loadLastReservation();
  resultEl.hidden = true;
  if (!entry || !entry.payload) {
    genBtn.disabled = true;
    invoiceBtn.disabled = true;
    setStatus("Ще немає знятих даних бронювання. Відкрийте картку бронювання на сайті.", false);
    metaEl.textContent = "";
    return;
  }
  const code = entry.payload.ReservationCode || "—";
  const when = entry.capturedAt ? new Date(entry.capturedAt).toLocaleString("uk-UA") : "";
  setStatus("Дані бронювання готові.", true);
  metaEl.textContent = "Код: " + code + (when ? " · знято: " + when : "");
  genBtn.disabled = false;
  invoiceBtn.disabled = false;
}

genBtn.addEventListener("click", async () => {
  const entry = await loadLastReservation();
  if (!entry?.payload) return;
  const settings = await loadTemplateSettings();
  const picked = FdmTemplate.pickTemplateByAmount(
    entry.payload,
    settings.templateStandard,
    settings.templateHigh,
    settings.threshold
  );
  const catalog = await getRoomsCatalog();
  const text = FdmTemplate.applyTemplate(entry.payload, picked.template, settings.locale, catalog);
  try {
    await navigator.clipboard.writeText(text);
    var amountLabel = FdmTemplate.formatMoneyUA(picked.amount);
    var variantLabel =
      picked.variant === "high"
        ? "шаблон для великих сум (>" + FdmTemplate.formatMoneyUA(picked.threshold) + ")"
        : "звичайний шаблон (≤" + FdmTemplate.formatMoneyUA(picked.threshold) + ")";
    resultEl.textContent =
      "Скопійовано в буфер. " + variantLabel + ", сума: " + amountLabel + " грн.";
    resultEl.hidden = false;
    resultEl.classList.add("ok");
  } catch (e) {
    resultEl.textContent = "Не вдалося скопіювати: " + (e.message || e);
    resultEl.hidden = false;
    resultEl.classList.remove("ok");
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refresh();
});

document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
});

invoiceBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("invoice.html") });
});

var creditsModal = document.getElementById("creditsModal");
var creditsScrim = document.getElementById("creditsScrim");

function closeCredits() {
  creditsModal.hidden = true;
}

document.getElementById("creditsOpen").addEventListener("click", function (e) {
  e.preventDefault();
  creditsModal.hidden = false;
});

creditsScrim.addEventListener("click", closeCredits);

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !creditsModal.hidden) closeCredits();
});

refresh();
