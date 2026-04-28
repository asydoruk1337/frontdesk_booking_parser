# FrontDesk Master — booking letter template (Chrome extension)

A Chrome extension for [FrontDesk Master](https://app.frontdeskmaster.com/): it intercepts the JSON **expand** response when you open a reservation, fills in your text template, and copies the result to the clipboard.

## Features

- Captures the booking **expand** API payload (includes `ReservationCode`, `AssignedNights`, `Guests`, etc.).
- Configurable **letter template** (extension options) with placeholders mapped to the payload and format modifiers.
- **Ukrainian room descriptions** using `rooms.json` (`RoomUse` names from your property catalog).
- **Accommodation-only total**: sum of night rows (`AssignedNights.Price` / `BasicPrice`) plus a fixed note about tourist tax.
- Minimal popup: generate button, link to options, **made by A.S.** credit (`@`).

## Requirements

- **Google Chrome** (recent version recommended; Manifest V3).
- Same Chrome profile where you use [app.frontdeskmaster.com](https://app.frontdeskmaster.com/) (or another `*.frontdeskmaster.com` host — see `manifest.json`).

## Install from this repo

1. Clone the repo or unpack the archive locally.
2. Ensure **`rooms.json`** is in the project root — your room export from FDM (e.g. **Settings → Rooms** or the corresponding API). Without it, room text falls back to a simplified parse of `Room.Code`.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Reload the FrontDesk Master tab after you change scripts or `manifest`.

After editing files on disk, click **Reload** on the extension card at `chrome://extensions`.

## Usage

1. Sign in to FDM and open a **specific reservation** (so the expand request runs).
2. Click the extension icon → **Generate text**.
3. Text is copied to the clipboard; paste into email or chat.

Edit the template and date **locale** under **Template settings** (from the popup or `chrome://extensions` → **Extension options**). If a template is already saved in Chrome Sync, the code default will not overwrite it — update the textarea and click **Save**.

## Template placeholders

- `{{path.to.field}}` — same paths as in the booking JSON, e.g. `{{ReservationCode}}`, `{{Guests.0.Phone}}`.
- `{{CheckInDate|dmy}}`, `{{CheckOutDate|dmy}}` — dates as **DD/MM/YYYY**.
- `{{TotalPrice|moneyUA}}` — number with space thousands separators.
- `{{AssignedNights|roomLinesUk}}` — **Ukrainian** room line(s) from `rooms.json` + guest count for dorms.
- `{{AssignedNights|roomLines}}` — raw `Room.Code` values from the API.
- `{{FDM|totalWithTax}}` — accommodation total (sum of nights; otherwise `TotalPrice` minus detected tourist tax) plus the fixed phrase **«+ тур. збір (сплачується на рецепції)»** (Ukrainian copy as shipped).

More hints are on the extension **Options** page.

## File layout

| File | Role |
|------|------|
| `manifest.json` | Manifest V3, permissions, content scripts |
| `background.js` | Stores latest expand in `chrome.storage.session` |
| `inject-main.js` | `MAIN` world: hooks `fetch` / XHR for JSON expand |
| `content-bridge.js` | `postMessage` → `chrome.runtime` bridge |
| `templateEngine.js` | Templating, Ukrainian room copy, money & dates |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup |
| `options.html` / `options.js` / `options.css` | Template editor |
| `rooms.json` | Room catalog (loaded from the extension package) |
| `expand.json` | Sample API response (reference / testing; optional in package) |

## Other hosts

If the app or API uses a host **outside** `*.frontdeskmaster.com`, add it to `host_permissions` and `content_scripts.matches` in `manifest.json`.

## Privacy

The extension only processes reservation data **locally** in your browser. It does not send it to third-party servers. The last expand is kept in the extension’s **session** storage; the template is stored in **Chrome Sync** when you save options (if sync is enabled for extensions).

## License & credits

Built for internal / property use. In the popup, click **@** for **made by A.S.**
