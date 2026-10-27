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

On pokesurvivor.com the bot switches to **`/dev.html`** (the game's own dev build, same account and save): there it reads enemy, skill-zone and item positions straight from the game, so it dodges and picks up more accurately. To turn this off, run `localStorage['psbot.dev'] = '0'` in the console (F12).

### How the bot picks level-up cards

On every level-up the bot scores each card and takes the best one. The reason for each pick is printed in the console (F12), e.g. `chọn 2 Psychic — lấy move build #2` ("take build move #2").

**With a Moveset for the pokémon being played** (the bot recognises it by the name on the HUD; the 🎯 button in the popup reads that name). Priority, a higher tier always wins:

1. A card that **evolves** a skill.
2. **A build move** not taken yet (#1 before #2…).
3. **A new move outside the build while a slot is free**: the bot cycles through every move, so filling the slots (usually 4) means more attacks. Slots for the build moves not taken yet are always kept; e.g. a 2-move build gets 2 extra moves, a full 4-move build gets none.
4. **Learning** (the passive that raises the XP you gain): more levels sooner, so it comes before every upgrade.
5. **Upgrade a build attack move** (#1 first).
6. **A passive a build move needs to evolve** (e.g. Magnet for Psychic), once that move is owned and the passive isn't.
7. **Upgrade a build buff move** (no damage).
8. Other passives: attack (damage, cooldown, range…) > defence (HP, regen, armour, speed, pickup…) > the rest.
9. Upgrade a skill outside the build (highest level first).
10. A new skill outside the build with no slot left: only when nothing else is offered. If all three cards are like that and a **Reroll** is left, the bot rerolls (PC).

**Without a Moveset:** take new skills until the slots are full > Learning > keep upgrading owned skills (highest level first) > passive needed for an evolution > attack passive > defence passive. Moves that deal no damage rank lower. Evolution cards still come first.

Move slots: pokesurvivor.com reads them from the game (usually 4, can be upgraded), doofcraft counts 4. **Bonded** moves share one slot, so after a bond the bot takes more new moves. The game only offers a new move while a slot is free, so such a card tells the bot there is room.

The coin-farming preset is always on: pickup / XP / coin passives get a few extra points, never enough to override the build order above.

## Updates

- **PC:** when the panel shows the yellow line "⬆ Có bản mới" (new version available), download the ZIP from step 1 again and unzip it over the old folder.
- **Phone:** updates itself, nothing to do.

Need help installing: contact [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
