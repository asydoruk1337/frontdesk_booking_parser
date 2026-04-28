const OPTIONS_TEMPLATE_KEY = "fdmTemplate";
const OPTIONS_LOCALE_KEY = "fdmLocale";

const templateEl = document.getElementById("template");
const localeEl = document.getElementById("locale");
const saveBtn = document.getElementById("save");
const savedEl = document.getElementById("saved");

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

async function load() {
  const raw = await chrome.storage.sync.get({
    [OPTIONS_TEMPLATE_KEY]: defaultTemplate(),
    [OPTIONS_LOCALE_KEY]: "uk-UA",
  });
  templateEl.value = raw[OPTIONS_TEMPLATE_KEY];
  localeEl.value = raw[OPTIONS_LOCALE_KEY] || "uk-UA";
}

saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    [OPTIONS_TEMPLATE_KEY]: templateEl.value,
    [OPTIONS_LOCALE_KEY]: (localeEl.value || "uk-UA").trim() || "uk-UA",
  });
  savedEl.hidden = false;
  setTimeout(function () {
    savedEl.hidden = true;
  }, 2000);
});

load();
