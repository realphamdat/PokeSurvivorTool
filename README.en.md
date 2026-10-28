# PokeSurvivor Bot

[Tiếng Việt](README.md) · **English**

Auto-play bot for [pokesurvivor.com](https://pokesurvivor.com/) and [pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/) (detects the game version from the site). Free · by [damhieu2808](https://github.com/damhieu2808)

## Install on PC (Chrome)

1. [**Download the bot (ZIP)**](https://github.com/damhieu2808/PokeSurvivorTool/archive/refs/heads/release.zip). This link always gets the latest version.
2. Unzip it, open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.

## Install on a phone (Android)

> ℹ️ The whole bot is inside the userscript file. The userscript manager runs that code in the page itself, so pokesurvivor.com blocking scripts added to the page (CSP) no longer matters. **Firefox** is recommended. Edge / Kiwi + Tampermonkey on Android did not work with the old version; the new way is not tested there yet.

1. Install **Firefox** (Play Store).
2. In Firefox, install the **Violentmonkey** or **Tampermonkey** add-on (menu ⋮ → Add-ons).
3. Tap the copy button on the block below, paste into that browser's **address bar** and open it:

```
https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js
```

4. The manager opens its install page → tap **Install**. If an older version is installed, install over it.
5. Open the game: the **PokeSurvivor Bot** panel appears in the top-left corner.

The manager checks for new versions on its own from time to time. To update right away: open the manager → **Check for updates**, or open the link from step 3 again.

## Install on iPhone / iPad

1. Install the **Userscripts** app (App Store, free).
2. Open **Settings → Safari → Extensions → Userscripts**: turn it on and allow it on all websites.
3. In **Safari**, paste the link from step 3 of the Android section into the address bar and open it.
4. Tap the extensions icon (puzzle piece or **aA**) in the address bar → **Userscripts** → **Install**.
5. Open the game in Safari: the panel appears in the top-left corner. iOS is untested; pokesurvivor.com may be blocked as on Android. If something goes wrong, use the contact below.

## Use

The panel is in Vietnamese. Enter **Số ván** (number of runs, 0 = forever) and press **▶ Chạy** (Run); press it again to **■ Dừng** (Stop). **⚔ Moveset** picks the 4 moves the bot prefers for each pokémon. On pokesurvivor.com the list also has the TM moves that pokémon can learn (Kecleon Shop): "TM ✓" = already taught, "TM" = not yet (the game only offers taught TMs). PC shortcuts: **F8** toggles the bot, **F9** shows an overlay of what the bot sees.

**Không gửi bảng xếp hạng** (don't submit to the leaderboard; pokesurvivor.com, on by default): runs the bot plays are not submitted to the leaderboard. Runs you play yourself (bot off) still are. Untick it on the panel to let the bot's runs count.

**🎃 Event Halloween:** this button works while the game has an event on, otherwise it is disabled.
- **[pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/):** runs the event's Waves mode.
- **[pokesurvivor.com](https://pokesurvivor.com/):** from 30/10 to 1/11 every run is a Halloween run, and the button works like ▶ Chạy.

> ⚠️ **Bot 1.5.0–1.5.6 moved pokesurvivor.com to `/dev.html`.** Since 26/10 that page of the game no longer uses your account (no cloud save, no ranking). From 1.5.7 the bot takes you back to the main page. If the address shows `pokesurvivor.com/dev.html`, update the bot and open `pokesurvivor.com` again.

### How the bot picks level-up cards

On every level-up the bot scores each card and takes the best one. The reason for each pick is printed in the console (F12), e.g. `chọn 2 Psychic — lấy move build #2` ("take build move #2").

**With a Moveset for the pokémon being played** (the bot recognises it by the name on the HUD; the 🎯 button in the popup reads that name, or the partner in the save while at the menu). A pokémon without a Moveset of your own uses a default build: the best one [SurvivorTiers](https://survivortiers.pages.dev/en/) found in simulated runs (refreshed with `node crawl-moves.js --builds`). Priority, a higher tier always wins:

1. A card that **evolves** a skill.
2. **A build move** not taken yet (#1 before #2…).
3. **Upgrade a build move, in Moveset order**: move #1 is maxed first, then #2… (attack and buff moves alike). Put the move you want maxed first at the top.
4. **A new move outside the build while a slot is free**: the bot cycles through every move, so filling the slots (usually 4) means more attacks. Slots for the build moves not taken yet are always kept; e.g. a 2-move build gets 2 extra moves, a full 4-move build gets none.
5. **Learning** (the passive that raises the XP you gain).
6. **A passive a build move needs to evolve** (e.g. Magnet for Psychic), once that move is owned and the passive isn't.
7. Other passives: attack (damage, cooldown, range…) > defence (HP, regen, armour, speed, pickup…) > the rest.
8. Upgrade a skill outside the build (highest level first).
9. A new skill outside the build with no slot left: only when nothing else is offered.

If the best card is only of kind 8–9 and a **Reroll** is left, the bot rerolls (PC; on pokesurvivor.com phones too).

**Without a build** (default build deleted): take new skills until the slots are full > Learning > keep upgrading owned skills (highest level first) > passive needed for an evolution > attack passive > defence passive. Moves that deal no damage rank lower. Evolution cards still come first.

Move slots: pokesurvivor.com reads them from the game (usually 4, can be upgraded), pokesurvivor.doofcraft.com counts 4. **Bonded** moves share one slot, so after a bond the bot takes more new moves. The game only offers a new move while a slot is free, so such a card tells the bot there is room.

The coin-farming preset is always on: pickup / XP / coin passives get a few extra points, never enough to override the build order above.

**Survival rules** (both versions), above the order above:
- **Sitrus Berry** (heals 45% HP) under 35% HP: first.
- A passive that **evolves a maxed move at once**: right after evolution cards (pokesurvivor.com).
- **Armor**: before any move upgrade, only after build moves not taken yet. pokesurvivor.com: -6% damage taken per card, up to 70%. Doofcraft: up to 20 cards (~67%).

**Held items** (both versions), ranked for survival: Shell Bell > Leftovers > Quick Claw > Focus Sash > Assault Vest > Rocky Helmet > Lucky Egg > Amulet Coin > Choice Scarf > Life Orb > Choice Band (always dropped).

### How the bot plays on pokesurvivor.com

The bot reads the game's real state instead of the screen. Its steering is based on [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT):
- **Dodging:** scores 16 directions, predicts where enemies will have caught up and when each telegraph lands (where the player is when it does). The lower the HP, the more common enemies are avoided; bosses, shots and telegraphs always are.
- **Targets:** Gholdengo > rift > lost pokémon / Meowth > altar buff, healing spring (HP < 60%), big chest > pickups. Routes come from A* on the real terrain; a target that can't be reached before it's gone is skipped.
- Stands where walls / trees don't block its shots. With a crowd around, it runs a big circle with the enemies trailing behind.
- **Rift** and **Arceus** (minute 30): circles inside the arena, keeping the boss on the far side.
- **Orbs:** a crowd-control orb under 40% HP or with 8 enemies on the player, a buff orb while a boss is up (before, the bot pressed 5–8 all the time and used them at once).
- When the game pauses itself on losing focus, the bot unpauses it (unless you paused with Esc / P).

Without the game's state (bookmarklet, doofcraft) the bot works as before, reading the screen.

## Updates

- **PC:** when the panel shows the yellow line "⬆ Có bản mới" (new version available), download the ZIP from step 1 again and unzip it over the old folder.
- **Phone:** the userscript manager updates it from time to time (or tap **Check for updates**).

Need help installing: contact [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
