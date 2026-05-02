const STORAGE_KEY = "fdmLastReservation";
const OPTIONS_TEMPLATE_KEY = "fdmTemplate";
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

async function loadTemplateAndLocale() {
  const raw = await chrome.storage.sync.get({
    [OPTIONS_TEMPLATE_KEY]: defaultTemplate(),
    [OPTIONS_LOCALE_KEY]: "uk-UA",
  });
  return {
    template: raw[OPTIONS_TEMPLATE_KEY],
    locale: raw[OPTIONS_LOCALE_KEY] || "uk-UA",
  };
}

function defaultTemplate() {
  return [
    "Щойно з Вами спілкувались щодо бронювання.",
    "",
    "Код бронювання: {{ReservationCode}}",
    "",
    "Дати бронювання: {{CheckInDate|dmy}} - {{CheckOutDate|dmy}}",
    "",
    "Тип кімнати:",
    "{{AssignedNights|roomLinesUk}}",
    "",
    "Загальна вартість: {{FDM|totalWithTax}}",
    "",
    "Просимо внести передоплату розміром 50% або 100% за тиждень до заселення за цими реквізитами:",
    "",
    'ТОВ "ДРІМ ХОСТЕЛ ЗАХІД"',
    "ЄДПРОУ 40740523",
    "Р/р:UA053257960000026009300585226",
    "ФІЛІЯ ЛЬВІВСЬКЕ УПРАВЛІННЯ АТ ",
    '"ОЩАДБАНК",',
    "МФО 325796",
    "Компанія є платником єдиного податку ",
    "3- тя група",
    "Тел.: +38 (032) 247-10-47",
    "",
    "Важлива інформація:",
    "",
    "Час заселення 15:00, час виселення 11:00",
    "",
    "Умови скасування: Ви можете скасувати чи внести зміни у Ваше бронювання безкоштовно за тиждень до дати заїзду, в іншому випадку кошти не повертаються.",
  ].join("\n");
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
  const { template, locale } = await loadTemplateAndLocale();
  const catalog = await getRoomsCatalog();
  const text = FdmTemplate.applyTemplate(entry.payload, template, locale, catalog);
  try {
    await navigator.clipboard.writeText(text);
    resultEl.textContent = "Скопійовано в буфер.";
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
  const url = chrome.runtime.getURL("invoice.html");
  chrome.tabs.create({ url });
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
