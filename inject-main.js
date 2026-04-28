(function () {
  const MESSAGE_SOURCE = "fdm-reservation-ext";

  function isExpandShape(data) {
    if (!data || typeof data !== "object") return false;
    return (
      typeof data.ReservationCode === "string" &&
      Array.isArray(data.AssignedNights) &&
      Array.isArray(data.Guests)
    );
  }

  function postPayload(payload) {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: "RESERVATION_EXPAND",
        payload,
      },
      "*"
    );
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then((response) => {
      try {
        if (
          response.status < 200 ||
          response.status >= 300 ||
          !response.headers.get("content-type")?.includes("application/json")
        ) {
          return response;
        }
        const clone = response.clone();
        clone.text().then((text) => {
          const data = tryParseJson(text);
          if (isExpandShape(data)) postPayload(data);
        });
      } catch {
        /* ignore */
      }
      return response;
    });
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__fdmUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        const ct = this.getResponseHeader("content-type") || "";
        if (!ct.includes("application/json")) return;
        const data = tryParseJson(this.responseText);
        if (isExpandShape(data)) postPayload(data);
      } catch {
        /* ignore */
      }
    });
    return origSend.apply(this, args);
  };
})();
