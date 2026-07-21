/**
 * Parses FrontDeskMaster /Date(ms)/ strings and returns formatted date for locale.
 */
function formatFdmValue(value, locale) {
  locale = locale || "uk-UA";
  if (value == null) return "";
  if (typeof value === "string") {
    const m = value.match(/^\/Date\((-?\d+)\)\/$/);
    if (m) {
      const d = new Date(Number(m[1]));
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(locale);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map((v) => formatFdmValue(v, locale)).join(", ");
    return "";
  }
  return String(value);
}

function getByPath(obj, path) {
  if (!path) return obj;
  const segments = path.split(".").map((s) => {
    const n = Number(s);
    return Number.isInteger(n) && String(n) === s ? n : s;
  });
  var cur = obj;
  for (var i = 0; i < segments.length; i++) {
    if (cur == null) return undefined;
    cur = cur[segments[i]];
  }
  return cur;
}

/** DD/MM/YYYY у локальній календарній даті браузера */
function toDateDMY(value) {
  var ms = null;
  if (value == null) return "";
  if (typeof value === "string") {
    var m = value.match(/^\/Date\((-?\d+)\)\/$/);
    if (m) ms = Number(m[1]);
    else return value;
  } else if (typeof value === "number") ms = value;
  else return "";
  var d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  var dd = String(d.getDate()).padStart(2, "0");
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

/** Ціле число з пробілом як розділювач тисяч (на кшталт 10 250) */
function formatMoneyUA(value) {
  if (value == null || value === "") return "";
  var num = Number(value);
  if (Number.isNaN(num)) return String(value);
  var rounded = Math.round(num);
  var neg = rounded < 0;
  var s = String(Math.abs(rounded));
  var parts = [];
  while (s.length > 3) {
    parts.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }
  if (s) parts.unshift(s);
  return (neg ? "-" : "") + parts.join(" ");
}

/** Унікальні Room.Code з масиву ночей */
function roomLinesFromNights(arr) {
  if (!Array.isArray(arr)) return "";
  var seen = Object.create(null);
  var lines = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    var code = item && item.Room && item.Room.Code;
    if (code == null || code === "") continue;
    var k = String(code);
    if (seen[k]) continue;
    seen[k] = true;
    lines.push(k);
  }
  return lines.join("\n");
}

/** Сума турзбору / city tax тощо з SaleItemHistory (fallback від TotalPrice) */
function sumTouristTaxUa(reservation) {
  if (!reservation || !Array.isArray(reservation.SaleItemHistory)) return 0;
  var sum = 0;
  var any = false;
  for (var i = 0; i < reservation.SaleItemHistory.length; i++) {
    var row = reservation.SaleItemHistory[i];
    if (!row) continue;
    var sale = row.SaleItem || {};
    var title = (sale.Title && String(sale.Title)) || "";
    var cat = sale.SaleItemCategoryId;
    var taxLike =
      cat === 11 ||
      /tourist|тур(ист)?|city\s*tax|місцевий/i.test(title);
    if (!taxLike) continue;
    var c = Number(row.Cost);
    if (!Number.isNaN(c)) {
      sum += c;
      any = true;
    }
  }
  return any ? sum : 0;
}

/** Сума лише проживання: Price/BasicPrice по кожній ночі з AssignedNights */
function sumAccommodationFromAssignedNights(reservation) {
  if (!reservation || !Array.isArray(reservation.AssignedNights)) return null;
  var sum = 0;
  var count = 0;
  for (var i = 0; i < reservation.AssignedNights.length; i++) {
    var night = reservation.AssignedNights[i];
    if (!night) continue;
    var raw = night.Price;
    if (raw == null || raw === "") raw = night.BasicPrice;
    var p = Number(raw);
    if (Number.isNaN(p)) continue;
    sum += p;
    count++;
  }
  if (count < 1) return null;
  return sum;
}

/**
 * Вартість проживання для листа: спочатку сума ночей (без тур. зборів і позицій зі SaleItemHistory),
 * інакше TotalPrice мінус виявлений тур. збір.
 */
function accommodationTotalUa(reservation) {
  var fromNights = sumAccommodationFromAssignedNights(reservation);
  if (fromNights != null && fromNights >= 0) return fromNights;
  var total = Number(reservation && reservation.TotalPrice);
  if (Number.isNaN(total)) total = 0;
  var tax = sumTouristTaxUa(reservation);
  var net = total - tax;
  return net < 0 ? total : net;
}

var FDM_TOTAL_TOURIST_NOTE = " + тур. збір (сплачується на рецепції)";

/** Проживання (форматовано) + статичне уточнення про тур. збір */
function formatTotalWithTouristTaxLine(reservation) {
  return formatMoneyUA(accommodationTotalUa(reservation)) + FDM_TOTAL_TOURIST_NOTE;
}

/** Англ. об'єкт RoomUse з каталогу rooms.json */
function findRoomUseInCatalog(catalog, roomId, roomUseId) {
  if (catalog == null || !Array.isArray(catalog.Collection)) return null;
  if (roomId == null || roomUseId == null) return null;
  var room = null;
  for (var i = 0; i < catalog.Collection.length; i++) {
    if (catalog.Collection[i] && catalog.Collection[i].Id === roomId) {
      room = catalog.Collection[i];
      break;
    }
  }
  if (!room || !Array.isArray(room.RoomRoomUses)) return null;
  var preferred = null;
  var first = null;
  for (var j = 0; j < room.RoomRoomUses.length; j++) {
    var rru = room.RoomRoomUses[j];
    if (!rru || !rru.RoomUse || rru.RoomUse.Id !== roomUseId) continue;
    var ru = rru.RoomUse;
    if (rru.IsMainRoomUse === true) return ru;
    if (!preferred) preferred = ru;
    if (!first) first = ru;
  }
  return preferred || first || null;
}

/** Кількість унікальних гостей на цю кімнату + тариф (усі ночі бронювання) */
function countDistinctGuestsForRoomUse(reservation, roomId, roomUseId) {
  if (reservation == null || !Array.isArray(reservation.AssignedNights)) return 1;
  if (roomId == null || roomUseId == null) return 1;
  var seen = Object.create(null);
  var count = 0;
  for (var i = 0; i < reservation.AssignedNights.length; i++) {
    var an = reservation.AssignedNights[i];
    if (!an || !an.Room || !an.RoomUse) continue;
    if (an.Room.Id !== roomId || an.RoomUse.Id !== roomUseId) continue;
    var gid = an.Guest && an.Guest.Id;
    if (gid != null) {
      var ks = String(gid);
      if (seen[ks]) continue;
      seen[ks] = true;
      count++;
    }
  }
  if (count < 1) {
    var p = reservation.People != null ? Number(reservation.People) : 0;
    if (p >= 1) return Math.round(p);
    return 1;
  }
  return count;
}

/** Скільки місць «броні», якщо немає повного reservation */
function bookedPlacesForNight(_night) {
  return 1;
}

/** 1 місце / 2 місця / 5 місць тощо */
function ukMisceCountPhrase(k) {
  k = Math.round(Number(k));
  if (!Number.isFinite(k) || k < 1) k = 1;
  var mod100 = k % 100;
  var mod10 = k % 10;
  if (mod100 >= 11 && mod100 <= 14) return k + " місць";
  if (mod10 === 1) return k + " місце";
  if (mod10 >= 2 && mod10 <= 4) return k + " місця";
  return k + " місць";
}

function dormGenderAdj(gender) {
  if (gender === "female") return "жіночому";
  if (gender === "male") return "чоловічому";
  return "змішаному";
}

/** Для дормів: «в … номері зі/з … санвузлом» */
function bathroomPhrase(shared) {
  return shared ? "зі спільним санвузлом" : "з власним санвузлом";
}

/** Для приватних номерів (Double, Twin, Triple…): «… і власним/спільним санвузлом» */
function privateBathroomEnding(shared) {
  return shared ? "і спільним санвузлом" : "і власним санвузлом";
}

/**
 * Розбір англ. назви тарифу → метадані для укр. фрази
 */
function parseRoomUseMeta(nameEn, ru) {
  var m = (nameEn || "").trim();
  var n = ru && ru.NumberOfPeople != null ? Number(ru.NumberOfPeople) : null;
  var ensuiteRu = ru && ru.Ensuite === true;
  function inferShared(frag) {
    if (frag) {
      if (/shared\s+bathroom/i.test(frag)) return true;
      if (/^ensuite$/i.test(frag) || /\bensuite\b/i.test(frag)) return false;
    }
    return !ensuiteRu;
  }
  var dm = /^(\d+)\s+Bed\s+(Mixed|Female|Male)\s+Dorm\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (dm) {
    var nn = Number(dm[1]);
    var g = dm[2].toLowerCase();
    var shared = /shared/i.test(dm[3]);
    return {
      kind: "dorm",
      n: nn,
      gender: g === "female" ? "female" : g === "male" ? "male" : "mixed",
      shared: shared,
    };
  }
  var twin = /^Twin\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (twin) {
    return { kind: "twin", n: n || 2, shared: inferShared(twin[1]) };
  }
  var dbl = /^Double\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (dbl) {
    return { kind: "double", n: n || 2, shared: inferShared(dbl[1]) };
  }
  var trip = /^Triple\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (trip) {
    return { kind: "triple", n: n || 3, shared: inferShared(trip[1]) };
  }
  var quad = /^Quadruple\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (quad) {
    return { kind: "quadruple", n: n || 4, shared: inferShared(quad[1]) };
  }
  var famBed = /^(\d+)\s+Bed\s+Family\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (famBed) {
    return {
      kind: "familyBedRoom",
      n: Number(famBed[1]),
      shared: /shared/i.test(famBed[2]),
    };
  }
  var sing = /^Single\s+Room\s+(Shared\s+Bathroom|Ensuite)$/i.exec(m);
  if (sing) {
    return { kind: "single", n: n || 1, shared: inferShared(sing[1]) };
  }
  if (/^Family/i.test(m) && /(Shared\s+Bathroom|Ensuite)$/i.test(m)) {
    var fam = /(Shared\s+Bathroom|Ensuite)$/i.exec(m);
    return { kind: "family", n: n || 4, shared: inferShared(fam ? fam[1] : "") };
  }
  return { kind: "unknown", n: n, shared: !ensuiteRu, rawName: m };
}

function formatRoomUkFromMeta(k, meta) {
  if (!meta || !meta.kind) return "";
  var places = ukMisceCountPhrase(k);
  // Місткість/тип номера з тарифу (Quadruple → 4), не з кількості гостей k
  var n = meta.n != null && !Number.isNaN(meta.n) ? meta.n : 1;
  if (meta.kind === "dorm") {
    return (
      places +
      " в " +
      n +
      "-місному " +
      dormGenderAdj(meta.gender) +
      " номері " +
      bathroomPhrase(!!meta.shared)
    );
  }
  if (meta.kind === "twin") {
    return (
      n +
      "-місний номер з двома односпальними ліжками " +
      privateBathroomEnding(!!meta.shared)
    );
  }
  if (meta.kind === "double") {
    return n + "-місний номер з двоспальним ліжком " + privateBathroomEnding(!!meta.shared);
  }
  if (meta.kind === "triple") {
    return n + "-місний номер " + privateBathroomEnding(!!meta.shared);
  }
  if (meta.kind === "quadruple") {
    return n + "-місний сімейний номер " + privateBathroomEnding(!!meta.shared);
  }
  if (meta.kind === "familyBedRoom") {
    return (
      n + "-місний сімейний номер " + (meta.shared ? "зі спільним санвузлом" : "з власним санвузлом")
    );
  }
  if (meta.kind === "single") {
    return n + "-місний номер " + privateBathroomEnding(!!meta.shared);
  }
  if (meta.kind === "family") {
    var famN = meta.n != null && !Number.isNaN(meta.n) ? meta.n : 4;
    return famN + "-місний сімейний номер " + privateBathroomEnding(!!meta.shared);
  }
  if (meta.rawName) return translateRoomNameHeuristic(meta.rawName);
  return "";
}

/** Залишено для зворотної сумісності / тестів */
function translateRoomUseNameEnToUk(name) {
  var meta = parseRoomUseMeta(name, null);
  if (meta.kind !== "unknown") return formatRoomUkFromMeta(1, meta);
  return translateRoomNameHeuristic(name || "");
}

/** Якщо немає правила — спрощений переклад слів */
function translateRoomNameHeuristic(name) {
  var t = name;
  t = t.replace(/\b(\d+)\s+Bed\s+Mixed\s+Dorm\b/gi, "$1-місний змішаний дорміторій");
  t = t.replace(/\b(\d+)\s+Bed\s+Female\s+Dorm\b/gi, "$1-місний жіночий дорміторій");
  t = t.replace(/\b(\d+)\s+Bed\s+Male\s+Dorm\b/gi, "$1-місний чоловічий дорміторій");
  t = t.replace(/\bShared\s+Bathroom\b/gi, "(спільний санвузол)");
  t = t.replace(/\bEnsuite\b/gi, "(власний санвузол)");
  t = t.replace(/\bTwin\s+Room\b/gi, "номер Twin");
  t = t.replace(/\bDouble\s+Room\b/gi, "номер Double");
  t = t.replace(/\bTriple\s+Room\b/gi, "тримісний номер");
  t = t.replace(/\bQuadruple\s+Room\b/gi, "чотири-місний номер");
  t = t.replace(/\bDorm\b/gi, "дорміторій");
  t = t.replace(/\bRoom\b/gi, "номер");
  return t.trim();
}

/** З Room.Code, якщо каталогу немає — та сама структура фрази; k = кількість місць бронювання */
function translateFromRoomCodeFallback(code, k) {
  k = k == null ? 1 : Math.max(1, Math.round(Number(k)) || 1);
  if (!code || typeof code !== "string") return "";
  var mLead = code.match(/^\s*(\d+)\s*#/i);
  var n = mLead ? Number(mLead[1]) : null;
  var rest = code.replace(/^\s*\d+\s*#\s*/i, "").trim();
  rest = rest.replace(/\s+\d{1,4}\s*$/i, "").trim();
  if (!rest) return "";
  var low = rest.toLowerCase();
  var gender = "mixed";
  if (/female/i.test(low)) gender = "female";
  else if (/male/i.test(low)) gender = "male";
  var shared = true;
  if (/ensuite/i.test(low)) shared = false;
  else if (/shared/i.test(low)) shared = true;
  var nn = n != null && !Number.isNaN(n) ? n : 4;
  if (/mixed|female|male|shared|ensuite|dorm/i.test(low)) {
    return (
      ukMisceCountPhrase(k) +
      " в " +
      nn +
      "-місному " +
      dormGenderAdj(gender) +
      " номері " +
      bathroomPhrase(shared)
    );
  }
  return translateRoomNameHeuristic(rest);
}

function describeAssignedNightUk(night, catalog, reservation) {
  var room = (night && night.Room) || {};
  var roomId = room.Id;
  var roomUseId = night.RoomUse && night.RoomUse.Id;
  var k = reservation
    ? countDistinctGuestsForRoomUse(reservation, roomId, roomUseId)
    : bookedPlacesForNight(night);
  var ru = findRoomUseInCatalog(catalog, roomId, roomUseId);
  var line = "";
  if (ru && ru.Name) {
    var meta = parseRoomUseMeta(ru.Name, ru);
    line = formatRoomUkFromMeta(k, meta);
  }
  if (!line) line = translateFromRoomCodeFallback(room.Code || "", k);
  if (!line) line = "тип кімнати зазначено в системі";
  return line;
}

/** Унікальні комбінації кімната + тариф; k = унікальні гості по всьому бронюванню */
function roomLinesUkFromAssignedNights(nights, catalog, reservation) {
  if (!Array.isArray(nights)) return "";
  var seen = Object.create(null);
  var lines = [];
  for (var i = 0; i < nights.length; i++) {
    var n = nights[i];
    var room = (n && n.Room) || {};
    var ru = (n && n.RoomUse) || {};
    var key = [room.Id, ru.Id].join("|");
    if (seen[key]) continue;
    seen[key] = true;
    lines.push(describeAssignedNightUk(n, catalog, reservation));
  }
  return lines.join("\n");
}

function applyModifier(obj, path, mod, locale, roomsCatalog) {
  var m = (mod || "").trim().toLowerCase();
  var val = getByPath(obj, path);
  if (m === "dmy") return toDateDMY(val);
  if (m === "moneyua") return formatMoneyUA(val);
  if (m === "roomlines") return roomLinesFromNights(Array.isArray(val) ? val : []);
  if (m === "roomlinesuk")
    return roomLinesUkFromAssignedNights(Array.isArray(val) ? val : [], roomsCatalog, obj);
  if (String(path).toUpperCase() === "FDM" && m === "totalwithtax") return formatTotalWithTouristTaxLine(obj);
  return formatFdmValue(val, locale);
}

/**
 * Плейсхолдери: {{Шлях}} або {{Шлях|модифікатор}}
 * roomsCatalog — об'єкт з rooms.json (опційно), для roomLinesUk
 */
function applyTemplate(obj, template, locale, roomsCatalog) {
  if (!template) return "";
  locale = locale || "uk-UA";
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_full, raw) {
    var pipe = raw.indexOf("|");
    var path = (pipe >= 0 ? raw.slice(0, pipe) : raw).trim();
    var mod = pipe >= 0 ? raw.slice(pipe + 1).trim() : "";
    if (mod) return applyModifier(obj, path, mod, locale, roomsCatalog);
    return formatFdmValue(getByPath(obj, path), locale);
  });
}

/** Дефолтний поріг (грн): вище — шаблон для великих сум */
var DEFAULT_TEMPLATE_THRESHOLD = 10000;

function defaultTemplateStandard() {
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

/** Шаблон для бронювань дорожчих за поріг (за замовчуванням — 100% передоплата) */
function defaultTemplateHigh() {
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
    "Просимо внести передоплату розміром 100% за тиждень до заселення за цими реквізитами:",
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

/**
 * Вибір шаблону за вартістю проживання (accommodationTotalUa).
 * Якщо сума > threshold — high, інакше standard.
 */
function pickTemplateByAmount(reservation, templateStandard, templateHigh, threshold) {
  var amount = accommodationTotalUa(reservation);
  var limit = Number(threshold);
  if (Number.isNaN(limit) || limit < 0) limit = DEFAULT_TEMPLATE_THRESHOLD;
  var useHigh = amount > limit;
  return {
    template: useHigh ? templateHigh : templateStandard,
    variant: useHigh ? "high" : "standard",
    amount: amount,
    threshold: limit,
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.FdmTemplate = {
    applyTemplate: applyTemplate,
    formatFdmValue: formatFdmValue,
    getByPath: getByPath,
    toDateDMY: toDateDMY,
    formatMoneyUA: formatMoneyUA,
    roomLinesFromNights: roomLinesFromNights,
    roomLinesUkFromAssignedNights: roomLinesUkFromAssignedNights,
    sumTouristTaxUa: sumTouristTaxUa,
    accommodationTotalUa: accommodationTotalUa,
    sumAccommodationFromAssignedNights: sumAccommodationFromAssignedNights,
    formatTotalWithTouristTaxLine: formatTotalWithTouristTaxLine,
    findRoomUseInCatalog: findRoomUseInCatalog,
    translateRoomUseNameEnToUk: translateRoomUseNameEnToUk,
    ukMisceCountPhrase: ukMisceCountPhrase,
    parseRoomUseMeta: parseRoomUseMeta,
    formatRoomUkFromMeta: formatRoomUkFromMeta,
    countDistinctGuestsForRoomUse: countDistinctGuestsForRoomUse,
    defaultTemplateStandard: defaultTemplateStandard,
    defaultTemplateHigh: defaultTemplateHigh,
    DEFAULT_TEMPLATE_THRESHOLD: DEFAULT_TEMPLATE_THRESHOLD,
    pickTemplateByAmount: pickTemplateByAmount,
  };
}
