const OPTIONS_TEMPLATE_KEY = "fdmTemplate";
const OPTIONS_TEMPLATE_HIGH_KEY = "fdmTemplateHigh";
const OPTIONS_THRESHOLD_KEY = "fdmTemplateThreshold";
const OPTIONS_LOCALE_KEY = "fdmLocale";

const templateEl = document.getElementById("template");
const templateHighEl = document.getElementById("templateHigh");
const thresholdEl = document.getElementById("threshold");
const localeEl = document.getElementById("locale");
const saveBtn = document.getElementById("save");
const savedEl = document.getElementById("saved");

async function load() {
  const raw = await chrome.storage.sync.get({
    [OPTIONS_TEMPLATE_KEY]: FdmTemplate.defaultTemplateStandard(),
    [OPTIONS_TEMPLATE_HIGH_KEY]: FdmTemplate.defaultTemplateHigh(),
    [OPTIONS_THRESHOLD_KEY]: FdmTemplate.DEFAULT_TEMPLATE_THRESHOLD,
    [OPTIONS_LOCALE_KEY]: "uk-UA",
  });
  templateEl.value = raw[OPTIONS_TEMPLATE_KEY];
  templateHighEl.value = raw[OPTIONS_TEMPLATE_HIGH_KEY];
  var th = Number(raw[OPTIONS_THRESHOLD_KEY]);
  if (Number.isNaN(th) || th < 0) th = FdmTemplate.DEFAULT_TEMPLATE_THRESHOLD;
  thresholdEl.value = String(th);
  localeEl.value = raw[OPTIONS_LOCALE_KEY] || "uk-UA";
}

saveBtn.addEventListener("click", async () => {
  var th = Number(thresholdEl.value);
  if (Number.isNaN(th) || th < 0) th = FdmTemplate.DEFAULT_TEMPLATE_THRESHOLD;
  await chrome.storage.sync.set({
    [OPTIONS_TEMPLATE_KEY]: templateEl.value,
    [OPTIONS_TEMPLATE_HIGH_KEY]: templateHighEl.value,
    [OPTIONS_THRESHOLD_KEY]: th,
    [OPTIONS_LOCALE_KEY]: (localeEl.value || "uk-UA").trim() || "uk-UA",
  });
  thresholdEl.value = String(th);
  savedEl.hidden = false;
  setTimeout(function () {
    savedEl.hidden = true;
  }, 2000);
});

load();
