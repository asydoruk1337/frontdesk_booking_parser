(function () {
  const STORAGE_KEY = "fdmLastReservation";

  function formatMoneyInvoiceUa(value) {
    if (value == null || value === "") return "—";
    var num = Number(value);
    if (Number.isNaN(num)) return String(value);
    var neg = num < 0;
    num = Math.abs(num);
    var fixed = num.toFixed(2);
    var parts = fixed.split(".");
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg ? "-" : "") + intPart + "," + parts[1] + " грн";
  }

  function formatGuestFullName(g) {
    if (!g) return "";
    var bits = [g.FirstName, g.SecondLastName, g.LastName].map(function (s) {
      return (s && String(s).trim()) || "";
    }).filter(Boolean);
    return bits.join(" ");
  }

  function guestsDisplayLine(reservation) {
    var guests = reservation.Guests;
    if (!Array.isArray(guests)) return "—";
    var list = guests.filter(function (g) {
      return g && g.IsAssignToReservation;
    });
    if (list.length < 1 && reservation.OwnerGuestId != null) {
      list = guests.filter(function (g) {
        return g && g.Id === reservation.OwnerGuestId;
      });
    }
    if (list.length < 1) list = guests.slice();
    var names = [];
    var seen = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var n = formatGuestFullName(list[i]);
      if (!n || seen[n]) continue;
      seen[n] = true;
      names.push(n);
    }
    return names.length ? names.join(", ") : "—";
  }

  function docDateUk() {
    var d = new Date();
    try {
      return d.toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (_e) {
      return d.toLocaleDateString("uk-UA");
    }
  }

  var roomsCatalogCache;

  function getRoomsCatalog() {
    if (roomsCatalogCache !== undefined) {
      return Promise.resolve(roomsCatalogCache);
    }
    var url = chrome.runtime.getURL("rooms.json");
    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          roomsCatalogCache = null;
          return null;
        }
        return res.json();
      })
      .then(function (j) {
        roomsCatalogCache = j;
        return j;
      })
      .catch(function () {
        roomsCatalogCache = null;
        return null;
      });
  }

  function fillInvoice(payload, catalog) {
    var TE = globalThis.FdmTemplate;
    if (!TE) throw new Error("FdmTemplate не завантажено");

    var checkIn = TE.toDateDMY(payload.CheckInDate);
    var checkOut = TE.toDateDMY(payload.CheckOutDate);
    var code = payload.ReservationCode || "—";
    var room = TE.roomLinesUkFromAssignedNights(
      payload.AssignedNights || [],
      catalog,
      payload
    );
    if (!room) room = "—";

    var acc = TE.accommodationTotalUa(payload);
    var tax = TE.sumTouristTaxUa(payload);
    var total = acc + tax;

    document.getElementById("docDate").textContent = docDateUk();
    document.getElementById("fieldCode").textContent = code;
    document.getElementById("fieldStay").textContent = checkIn + " - " + checkOut;
    document.getElementById("fieldGuest").textContent = guestsDisplayLine(payload);
    document.getElementById("fieldRoom").textContent = room.replace(/\n/g, ", ");
    document.getElementById("fieldAcc").textContent = formatMoneyInvoiceUa(acc);
    document.getElementById("fieldTax").textContent = formatMoneyInvoiceUa(tax);
    document.getElementById("fieldTotal").textContent = formatMoneyInvoiceUa(total);
  }

  function showOnly(id) {
    ["stateEmpty", "stateError", "invoiceSheet"].forEach(function (key) {
      var el = document.getElementById(key);
      el.hidden = el.id !== id;
    });
  }

  function run() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.session) {
      document.getElementById("stateError").textContent =
        "Сторінку потрібно відкривати з розширення (кнопка «Інвойс» у спливаючому вікні).";
      showOnly("stateError");
      return;
    }

    chrome.storage.session.get(STORAGE_KEY, function (data) {
      var entry = data[STORAGE_KEY];
      if (!entry || !entry.payload) {
        showOnly("stateEmpty");
        return;
      }

      getRoomsCatalog()
        .then(function (catalog) {
          try {
            fillInvoice(entry.payload, catalog);
            showOnly("invoiceSheet");
          } catch (e) {
            document.getElementById("stateError").textContent =
              "Помилка заповнення: " + (e.message || e);
            showOnly("stateError");
          }
        })
        .catch(function (e) {
          document.getElementById("stateError").textContent =
            "Помилка: " + (e && e.message ? e.message : e);
          showOnly("stateError");
        });
    });
  }

  document.getElementById("btnPrint").addEventListener("click", function () {
    window.print();
  });
  document.getElementById("btnReload").addEventListener("click", function () {
    roomsCatalogCache = undefined;
    run();
  });

  run();
})();
