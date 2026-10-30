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

The panel is in Vietnamese. Enter **Số ván** (number of runs, 0 = forever) and press **▶ Chạy** (Run); press it again to **■ Dừng** (Stop). **⚔ Moveset** picks the 4 moves the bot prefers for each pokémon. The move list follows each game version, with the TM moves that pokémon can learn (pokesurvivor.com: Kecleon Shop; doofcraft: Poké Mart): "TM ✓" = already taught, "TM" = not yet (the game only offers taught TMs). PC shortcuts: **F8** toggles the bot, **F9** shows an overlay of what the bot sees.

**Small screens** (phones, especially held sideways): the panel is more compact and starts collapsed to its title row, with a **▶ / ■** button to run / stop; **+** opens it. The Moveset popup sits beside the panel instead of below it.

**Không gửi bảng xếp hạng** (don't submit to the leaderboard; pokesurvivor.com, on by default): runs the bot plays are not submitted to the leaderboard. Runs you play yourself (bot off) still are. Untick it on the panel to let the bot's runs count.

**Auto skill** (on by default): the bot keeps switching skills (E key) to use every move. Untick it and the bot stops switching; you switch by hand.

**Save after every run:** on pokesurvivor.com, after a run the bot goes back to the menu, presses **Guardar** (Save) and waits until the game says it is saved to the cloud before the next run (a minute at most). Doofcraft saves to its server when a run ends, so there is nothing to press.

**🎃 Event Halloween:** this button works while the game has an event on, otherwise it is disabled.
- **[pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/):** runs the event's Waves mode.
- **[pokesurvivor.com](https://pokesurvivor.com/):** from 30/10 to 1/11 every run is a Halloween run, and the button works like ▶ Chạy.

**⚡ Hyper** (pokesurvivor.doofcraft.com): runs the game's HYPER mode (everything scales twice as fast, Eternatus at 30:00, ×1.5 coins, its own leaderboard; a max-upgraded pokémon is recommended). Once the bot stops, the game's run mode goes back to what it was (for the event button too). If a saved run of another mode is waiting, the bot doesn't continue it: it stops and says so on the panel; continue it or press **End run** in the game first, then press the button again.

> ⚠️ **Bot 1.5.0–1.5.6 moved pokesurvivor.com to `/dev.html`.** Since 26/10 that page of the game no longer uses your account (no cloud save, no ranking). From 1.5.7 the bot takes you back to the main page. If the address shows `pokesurvivor.com/dev.html`, update the bot and open `pokesurvivor.com` again.

### How the bot picks level-up cards

On every level-up the bot scores each card and takes the best one. The reason for each pick is printed in the console (F12), e.g. `chọn 2 Psychic — lấy move build #2` ("take build move #2").

The order of [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT), on both versions. The **build** is the Moveset of the pokémon being played: the bot recognises it by the name on the HUD, or the partner in the save while at the menu. The popup follows the pokémon being played: once it's recognised, the popup only shows its name on the title row and the 4 moves. ✎ edits another pokémon's build (type its name); 🎯 goes back to following the one being played. That tool's builds come built in for 3 pokémon (Shell Bell recommended for all):
- **Mewtwo:** Confusion → Harden → Nasty Plot → Psychic.
- **Kyogre:** Bubble → Nasty Plot → Aqua Ring → Hydro Pump.
- **Bulbasaur:** Energy Ball → Nasty Plot → Petal Blizzard → Grass Knot (buy Energy Ball as its "Starting move" in the shop).

Any other pokémon without a Moveset gets a **3-move default build**: its starting move (★) → the attack buff for its side (Nasty Plot if Sp. Atk is higher, Swords Dance / Dragon Dance if Attack is) → Harden. The 4th slot is yours to set; until you save a build, the bot fills it during the run (a damage move that suits its stats, homing shots first). The Moveset popup shows this default build; edit it and press **Lưu** (Save) and the bot follows yours.

Move lists in the popup: on pokesurvivor.com they come **from the game** (the starting move you bought, TMs taught / not yet, names in the game's language) when the bot reads the game, else the copy saved the last time it did (or the bundled table, also exported from the game); doofcraft reads its game config. No wiki. The attack side comes from the game's stats, else from the starting move.

A higher tier always wins:

1. A card that **evolves** a skill.
2. A passive that **evolves a maxed move at once** (gold card; pokesurvivor.com).
3. **Sitrus Berry** (heals 45% HP) **under 35% HP**. At good HP it's near the bottom (after 7).
4. **A build move** not taken yet (#1 before #2…). Without a build: a new move while a slot is free, in the order above.
5. **A passive an owned move needs to evolve** (e.g. Magnet for Psychic), not taken yet. Above every move upgrade.
6. **Upgrade a move that can still evolve**: the nearer its max, the sooner; build moves get a little extra.
7. **Passives**: **Armor** first until capped (pokesurvivor.com: -6% damage taken per card, up to 70%; doofcraft: 20 cards, ~67%). Then Power > Reflexes > (Focus / Sniper, doofcraft) > Vigor > Synthesis > Learning > Magnet > Sprint.
8. **Upgrade a move that can't evolve** (build moves first, in build order).
9. **A new move outside the build** while a slot is to spare (slots for the build moves not taken yet are always kept).
10. A new skill with no slot left: only when nothing else is offered.

**Z-move** (pokesurvivor.doofcraft.com, cards like "Firium Z", "Psychium Z" with a Z-Move tag, from minute 15, round 10 in Waves, 7:30 in Hyper): ranked between 5 and 6. Once it has one, the bot presses **F** with 8 or more enemies within the burst (400), or 3 or more at low HP; it then recharges for 120 seconds.

If no card is of kind 1–7 and a **Reroll** is left, the bot rerolls (PC; on pokesurvivor.com phones too).

Move slots: pokesurvivor.com reads them from the game (usually 4, can be upgraded), pokesurvivor.doofcraft.com counts 4. **Bonded** moves share one slot, so after a bond the bot takes more new moves. The game only offers a new move while a slot is free, so such a card tells the bot there is room.

**Held items** (both versions), ranked for survival: Shell Bell > Leftovers > Quick Claw > Focus Sash > Assault Vest > Rocky Helmet > Lucky Egg > Amulet Coin > Choice Scarf > Life Orb > Choice Band (always dropped).

### How the bot plays on pokesurvivor.com

The bot reads the game's real state instead of the screen. Its steering is based on [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT):
- **Dodging:** scores 16 directions, predicts where enemies will have caught up and when each telegraph lands (where the player is when it does). The lower the HP, the more common enemies are avoided; bosses, shots and telegraphs always are.
- **Targets:** Gholdengo > rift > lost pokémon / Meowth > altar buff, healing spring (HP < 60%), big chest > pickups. Routes come from A* on the real terrain; a target that can't be reached before it's gone is skipped.
- Stands where walls / trees don't block its shots. With a crowd around, it runs a big circle with the enemies trailing behind.
- **Rift** and **Arceus** (minute 30): circles inside the arena, keeping the boss on the far side.
- **Orbs:** a crowd-control orb under 40% HP or with 8 enemies on the player, a buff orb while a boss is up (before, the bot pressed 5–8 all the time and used them at once).
- When the game pauses itself on losing focus, the bot unpauses it (unless you paused with Esc / P).
- **Pokémon suggestion** (on the menu / results screen): your 3 owned pokémon that play unattended best, and whether to switch from the current one. Scored with the game's damage formula: best unaimed move × the attack stat that move uses × same type (×1.2) × its own weather (Kyogre's rain: ×1.5 to Water) × toughness × speed × upgrades bought. The bot never switches by itself.

Without the game's state (bookmarklet, doofcraft) the bot works as before, reading the screen.

## Updates

- **PC:** when the panel shows the yellow line "⬆ Có bản mới" (new version available), download the ZIP from step 1 again and unzip it over the old folder.
- **Phone:** the userscript manager updates it from time to time (or tap **Check for updates**).

Need help installing: contact [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
