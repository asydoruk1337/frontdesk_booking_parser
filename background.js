const STORAGE_KEY = "fdmLastReservation";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FDM_RESERVATION_CAPTURED") {
    const payload = message.payload;
    chrome.storage.session.set({
      [STORAGE_KEY]: {
        payload,
        capturedAt: Date.now(),
        sourceUrl: message.sourceUrl ?? "",
      },
    });
    sendResponse({ ok: true });
    return true;
  }
});
