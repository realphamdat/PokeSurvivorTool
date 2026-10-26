# PokeSurvivor Bot

[Tiếng Việt](README.md) · **English**

Auto-play bot for [pokesurvivor.com](https://pokesurvivor.com) and [pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/#play) (detects the game version from the site). Free · by [damhieu2808](https://github.com/damhieu2808)

## Install on PC (Chrome)

1. [**Download the bot (ZIP)**](https://github.com/damhieu2808/PokeSurvivorTool/archive/refs/heads/release.zip). This link always gets the latest version.
2. Unzip it, open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.

## Install on a phone (Android)

> ⚠️ **pokesurvivor.com blocks injected scripts**, so on phones the bot may not run depending on the browser (Kiwi: doesn't work). If you see *"PSBot: trang này chặn script…"* (this page blocks scripts), use a PC or try another browser. **Doofcraft works fine** on phones.

1. Install a browser that supports extensions, e.g. **Kiwi Browser**, **Microsoft Edge** or **Firefox** (Play Store).
2. In that browser, install the **Tampermonkey** extension (on Firefox, use **Violentmonkey** if Tampermonkey isn't available).
3. Tap the copy button on the block below, paste into that browser's **address bar** and open it:

```
https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js
```

4. Tampermonkey opens its install page → tap **Install**.
5. Open the game. The first time, Tampermonkey asks for access to `raw.githubusercontent.com` (where the bot downloads its code): choose **Always allow**, then reload the page. Without it the bot can't run.
6. The **PokeSurvivor Bot** panel appears in the top-left corner.

## Install on iPhone / iPad

1. Install the **Userscripts** app (App Store, free).
2. Open **Settings → Safari → Extensions → Userscripts**: turn it on and allow it on all websites.
3. In **Safari**, paste the link from step 3 of the Android section into the address bar and open it.
4. Tap the extensions icon (puzzle piece or **aA**) in the address bar → **Userscripts** → **Install**.
5. Open the game in Safari: the panel appears in the top-left corner. iOS is untested; pokesurvivor.com may be blocked as on Android. If something goes wrong, use the contact below.

## Use

The panel is in Vietnamese. Enter **Số ván** (number of runs, 0 = forever) and press **▶ Chạy** (Run); press it again to **■ Dừng** (Stop). **⚔ Moveset** picks the 4 moves the bot prefers for each pokémon. PC shortcuts: **F8** toggles the bot, **F9** shows an overlay of what the bot sees.

## Updates

- **PC:** when the panel shows the yellow line "⬆ Có bản mới" (new version available), download the ZIP from step 1 again and unzip it over the old folder.
- **Phone:** updates itself, nothing to do.

Need help installing: contact [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
