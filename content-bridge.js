const MESSAGE_SOURCE = "fdm-reservation-ext";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== MESSAGE_SOURCE || data.type !== "RESERVATION_EXPAND") {
    return;
  }
  chrome.runtime.sendMessage(
    {
      type: "FDM_RESERVATION_CAPTURED",
      payload: data.payload,
      sourceUrl: location.href,
    },
    () => {
      const err = chrome.runtime.lastError;
      if (err) console.warn("[FDM ext]", err.message);
    }
  );
});
