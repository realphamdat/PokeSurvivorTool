# CLAUDE.md — PokeSurvivor Bot

Bot tự chơi cho 2 bản game PokeSurvivor: **pokesurvivor.com** ("bản thường", profile `default`) và **pokesurvivor.doofcraft.com** (bản viết lại, profile `doofcraft`). JS thuần, không build, không test framework. Chạy như Chrome extension MV3 (`content_scripts`, `world: "MAIN"`), hoặc qua `loader.js` (tải code của bản đã phát hành, nhánh `release`) / `psbot.user.js` (userscript gộp sẵn mọi file, sinh bởi `build-userscript.js`).

**Việc đang dở: đọc `NOTES.md` trước.** Cả 2 bản đã test trên game thật. Bản thường từng đọc cảnh từ `window.G` trên `/dev.html` (26/10), nhưng trên web trang đó giờ chạy offline (không tài khoản), nên từ 1.5.7 bot ở lại `/` và đọc canvas (NOTES.md mục 3). Việc còn mở: NOTES.md mục 3 bước 9–11 và mục 4. Mạng nơi làm việc của người dùng chặn pokesurvivor.com: ở đó chỉ test được doofcraft và trang giả lập.

## Người dùng & cách làm việc

- Người dùng nói tiếng Việt → trả lời tiếng Việt. Chữ hiển thị trong game/panel/log (`log(...)`, `why`, tooltip) viết **tiếng Việt**; comment trong code viết **tiếng Anh**, ngắn, đúng mật độ comment xung quanh.
- **Chỉ commit/push khi người dùng bảo.**
- **Hai nhánh:**
  - **`main`:** nơi làm việc. Push thoải mái, người dùng không thấy.
  - **`release`:** bản người dùng đang dùng. `loader.js` (userscript/bookmarklet tải file bot từ đây), link ZIP trong README/`docs/index.html`, và thông báo cập nhật (`manifest.json` trên `release`) đều đọc nhánh này.
  - **Không checkout `release`.** Chỉ cập nhật nó bằng lệnh phát hành bên dưới, và **chỉ khi người dùng bảo phát hành**.
- **Phát hành:**
  1. Tăng version ở **cả** `manifest.json` và `const VERSION` trong `core/bot.js`, rồi `node build-userscript.js` (sinh lại `psbot.user.js` với `@version` mới; trình quản lý userscript chỉ cập nhật khi `@version` tăng).
  2. Commit trên `main`.
  3. `git tag vX.Y.Z && git push origin main main:release --tags`
  4. (Tuỳ chọn) `gh release create vX.Y.Z --notes "…"`.
  - **Lùi bản:** `git push -f origin vX.Y.Z:release`.
- **Chỉ tăng version lúc phát hành.** Bản ZIP cũ (≤ 1.4.0) kiểm tra version bằng `manifest.json` trên `main`, nên tăng sớm sẽ báo "có bản mới" khi bản đó chưa lên `release`.
- **`loader.js` phải luôn có ở `main`:** userscript/bookmarklet cài trước đây tải nó từ `main`. Nó trỏ tới `release`, nên những người này vẫn chỉ nhận bản đã phát hành.
- Commit message: dòng tiêu đề tiếng Anh, thân giải thích lý do. Repo **công khai**: không bao giờ đưa mật khẩu, thông tin mạng/công ty của người dùng vào file hay commit.
- `account_test.js` (tài khoản test, `module.exports = { normal: {site,name,password}, doofcraft: {…} }`) nằm trong `.gitignore`, **không commit**. Nếu chưa có thì hỏi người dùng.

## Bản đồ code

- `core/bot.js`: toàn bộ bot, chạy trong IIFE `start()`. Các phần theo thứ tự:
  - `CFG` (thông số, có comment từng dòng).
  - Chặn lệnh vẽ canvas (`drawImage` / path / `fillText`) → `state.frame` gồm các item `{src, x, y, w, h, s, e, f, shape, pts…}`, toạ độ màn hình. Toạ độ world = `(x - e) / s`.
  - `tick()` mỗi frame:
    - Nhận diện chính mình theo số dex.
    - Phân loại theo `tagOf(src)`: `good` / `xp` / `rift` / `buff` / `case` / `break` / `wall` / `hazard` / `shot` / `safe`.
    - Đạn (`shot`) thành đường bay; `terrain` từ profile.
    - Phát hiện kẹt → `state.walls`.
    - Chọn mục tiêu (rift > prize (thief / shiny, chỉ có ở `scene` bản thường) > hồ hồi máu (`heal`, khi máu < 80%) > nhiệm vụ event (`SITE.objective`, doofcraft Halloween) > vali > buff > đồ tốt > kinh nghiệm > đá phá được > quái); bỏ mục tiêu có quái đứng sát (`crowded`), nằm trong vùng nguy hiểm (`inHazard`), hoặc khi máu thấp (`low`).
    - Nếu đường thẳng bị chặn: `planPath()` → A* (`makeGrid` / `findPath` / `lineClear`) → điểm đi tiếp `wp`.
    - `cost(dir)` chấm 16 hướng → `applyDir`.
  - `scoreCard()`: chấm thẻ lên cấp. Có build (Moveset) thì xếp theo tầng: tiến hoá 500 > move build chưa có 400 > nâng move build theo thứ tự build (#1 max trước, tấn công hay buff như nhau) 380 > move ngoài build khi còn ô (giữ ô cho move build chưa có; `SITE.moveSlots()` hoặc đếm thẻ "New"; bond gộp nhiều move vào 1 ô, game chỉ đưa thẻ move mới khi còn ô) 350 > Learning (tăng kinh nghiệm, `XP_RE`) 320 > nội tại để tiến hoá 250 > nội tại 150/146/140 > skill ngoài build. Không có build thì dùng logic cũ. **Từ 1.7.0 (người dùng chọn): thứ tự của pokesurvivor-autofarm, cả 2 bản, có hay không build** (comment trên `scoreCard`): tiến hoá 1000 > thẻ vàng 980 (`SITE.cardFacts().evoNow`) > Berry khi `hpRatio` < 35% 950 > move build chưa có 900 (không build: `autoNew` như `scoreNewMove` của tool kia: move sát thương đầu hợp phía tấn công 860+ > buff đúng phía 850 > Harden 845 > Aqua Ring 838 > move sát thương thứ 2 815+; phía / fit lấy từ `G.Stats` khi có, không thì theo move sát thương đang có; doofcraft không có phía) > nội tại move đang có cần để tiến hoá 700 > nâng move còn tiến hoá được 600–650 > nội tại 500+ (giáp 570 tới khi đầy: `armorFull` từ `G`, hoặc đếm `state.picks` tới `SITE.armorCards` (doofcraft 20, mặc định 12); rồi `STAT_PRI`) > nâng move không tiến hoá 430+ > move ngoài build còn ô thừa 200 > Berry máu khoẻ 10 > hết ô -100. Reroll khi < 500. Loại thẻ: site truyền `type` / `stat` / `maxLvl` / `evolved` (thẻ game phát), không thì đoán theo tên (`STAT_OF`). Nội tại không bao giờ được "dồn" như move. Đồ cầm: `CFG.itemScores` xếp cho sống lâu (Shell Bell đầu, Choice Band cuối). **Sửa thứ tự này thì cập nhật luôn mục "Bot chọn thẻ lên cấp thế nào" trong README.md + README.en.md.**
  - `levelUp` / `dialogRows` / `pickRow` / `tapEl` (điện thoại: bấm vào thẻ thay vì gửi phím). `autoRestart` (`state.runEnded`: `null` = chưa biết).
  - Panel, popup Moveset, danh mục F6, chạy nền, vòng lặp chính (đọc HUD: đồng hồ, máu `state.hpRatio`), gắn nhãn F7, `window.PSBot`.
- `sites/<id>/site.js` định nghĩa `window.PSBotSite = h => ({...profile})`. `h` là các helper của core (`CFG`, `state`, `visible`, `scoreCard`, `pickRow`…), được điền sau, nên chỉ dùng bên trong method. Các trường profile được giải thích trong NOTES.md mục 1.
- `sites/<id>/data.js`: nhãn sprite + build xuất từ nút "Xuất data.js" (F6). Thứ tự ưu tiên: mặc định < data.js < localStorage.
- Build mặc định (`defaultBuilds` trong `core/bot.js`, dưới `data.js` / localStorage): chỉ Mewtwo, Kyogre, Bulbasaur (build của pokesurvivor-autofarm). Pokémon khác: `autoBuild` (người dùng chọn: 3 move = move khởi đầu → buff tấn công đúng phía → Harden; mảng có `.auto`, ô trống chấm bằng `autoNew`). Danh sách move: `learnsetOf()` = `SITE.learnset` (bản thường có `G`: `G.Moves.poolFor`, `G.startMoveOf`, `G.Mons.taught/learnable`, tên qua `G.T`) hoặc wiki (`moves.js`). Popup Moveset tự theo pokémon đang chơi (🎯 bật sẵn; HUD / `SITE.partnerName()`); khi đang theo thì ẩn phần chọn pokémon (`[data-ms="pick"]`), tên lên tiêu đề, ✎ để sửa pokémon khác.
- Panel trên màn hình nhỏ (`SMALL` = `(max-height: 520px), (max-width: 600px)`, `@media` trong `PSB_CSS`): gọn, dock xếp ngang (panel + Moveset cạnh nhau), thu gọn sẵn lần đầu (`psbot.min` chưa có), nút `hplay` ▶/■ trên tiêu đề khi thu gọn. Từ 28/10 không dùng build SurvivorTiers nữa (đã bỏ khỏi `moves.js` và `crawl-moves.js`), `data.js` không giao build nào.
- `core/moves.js`: sinh bởi `node crawl-moves.js` (pokesurvivor.wiki). `node crawl-moves.js --evo` chỉ làm mới bảng tiến hoá (`evo`). `--tm` chỉ làm mới bảng TM (`tm`, `dex`, `id` của move; lấy từ `js/data/tms.js` của repo game). Popup Moveset đọc TM đã dạy từ save game trong localStorage (`ps.cloud.*` / `ps.save.*`, trường `ptm[dex]`, `partner`).
- Thứ tự nạp (manifest/loader): (`hook.js` lúc `document_start`) → `site.js` → (`pilot.js`, bản thường) → `data.js` → `moves.js` → `bot.js` → `farmMoney.js`. `loader.js` phải ở gốc repo (không nạp `hook.js` / `pilot.js`: nạp muộn thì không có `G`).
- `sites/default/hook.js` (bản thường, `document_start`): setter tạm `Object.prototype.Game` bắt object nội bộ của game (`ns`, có `BUILT === true` và `LIFT`) lúc game gán `ns.Game`, rồi gán `window.G = ns` → `scene()` đọc trạng thái game thật trên `/`. Nạp muộn (bookmarklet, `loader.js`) thì không bắt được → bot đọc canvas. Cách này học từ BoundlessEgret/pokesurvivor-autofarm (MIT).
- `sites/default/pilot.js` (`SITE.pilot`, chỉ khi có `G`): bộ lái chuyển từ pokesurvivor-autofarm. Ghi đè `G.Input.axis` (16 hướng × 3 bước, dự đoán quái đuổi, vùng skill theo `delay - t` của `G.Hazards.all`, mục tiêu theo tier + A* trên `World.isFree` + bỏ nếu không kịp, góc bắn `projectileBlock`, Rift / Arceus Judgment, kite vòng tròn, chống kẹt). `tick()` mỗi frame: orb, giữ ô move khi có move `orbit`, tự bỏ pause. `card(i)` đọc thẻ thật (bọc `G.LevelUp.offer`). Có `G` thì `site.js` `levelUp()` chấm thẻ từ chính thẻ game phát (`dealtCards`, chờ 0,7 s vì game bỏ qua cú bấm trong 0,6 s đầu) và chọn bằng `G.RunUI.pick` / `reroll`; bond / đồ cầm trả lời bằng `G.RunUI.pickBond` / click `#item-cards .card` (bọc `showBond` / `showItemChoice`), core `dialogPick` nhường. Kết thúc trận / menu / popup nhận theo id (`#scr-over` → `#btn-again`, `#scr-menu [data-go=play]`, `scr-news`…), chạy cả khi không có `G`: điện thoại hay lệch chữ / hit-test. Panel có dòng "Đọc game: có/không". Ở menu / kết quả (`Game.state` `ui` / `over`): dòng gợi ý pokémon (`suggestion()`, hàm `power()` của tool kia trên `G.DB.save.owned` / `DEX_BY` / `startChoices` / `DEX_ABIL` / `pupg`), chỉ đọc, không đổi partner. Khi `active()`, core bỏ qua `tick()` (không gửi WASD — game sẽ coi là người chơi bấm), `useItems`; `levelUp` thêm luật Baya Zidra / tiến hoá ngay / Coraza. Phím mũi tên người chơi bấm luôn được ưu tiên.
- `psbot.user.js` **là file sinh ra**, đừng sửa tay: `node build-userscript.js` gộp các file theo `manifest.json` (mỗi file bọc trong 1 hàm; `run_at: document_start` chạy ngay, phần còn lại chạy lúc `DOMContentLoaded`). Header `@grant none`, `@inject-into page`, `@run-at document-start`: trình quản lý tự chạy code trong trang nên CSP không chặn. Cập nhật qua `@updateURL` (nhánh `release`). Chỉ có `loader.js` và extension còn tải file riêng lẻ.
- Không gửi bảng xếp hạng: `site.js` (bản thường) bọc `G.Ranking.submitSolo/submitGroup`, bỏ qua khi bot đang chạy và `SITE.noRank.get()` (localStorage `psbot.norank`, khác `'0'` = bật). Checkbox trên panel chỉ hiện khi có `G`.

## Kiểm tra thay đổi

1. `node --check <file>` sau mỗi lần sửa.
2. **Trang giả lập** trong `dev/harness/` (dùng chrome-devtools MCP: mở `about:blank`, `evaluate_script` với `sourcePath` lần lượt harness → `sites/default/site.js` → (`core/moves.js` nếu cần) → `core/bot.js`, rồi gọi hàm của harness):
   - `pathfinding-sim.js`: game mini có tường/vùng skill. `await __run('open'|'cup'|'cupHazardLeft'|'cupHazardRight'|'closed'|'pocket'|'corner'|'cornerZone', ms)`. Mong đợi: `cup` lấy được trong khoảng 5s, `closed` có `ignored ≥ 1`, `cornerZone` (kẹt góc trong vùng skill) lấy được trong khoảng 3,5s.
   - `moveset-scoring.js`: `await __pick(ownedMoveNames, [[title, desc], …])` trả về thẻ bot chọn. Trước đó: `PSBot.play(0)`, `PSBot.setBuild(...)`.
   - `levelup-dialogs.js` (bản thường) / `levelup-doofcraft.js`: `await __scene(...)`, kiểm tra máy tính (gửi phím) và điện thoại (bấm vào thẻ; doofcraft dùng `emulate` touch).
3. **Game thật:** đăng nhập bằng `account_test.js`, nạp bot bằng `evaluate_script` theo thứ tự trên (nạp lại `bot.js` + `farmMoney.js` giữa trận cũng được, bot tự gỡ bản cũ), `PSBot.state.debug = true` (overlay F9), `PSBot.play(1)`. Gắn một `setInterval` ghi `state.view` / `hudTexts` mỗi 250ms để phân tích (ví dụ vì sao chết). Mỗi trận tốn vài phút trên tài khoản của người dùng, nên đừng chạy thừa.
4. **Debug có kiểm soát (bản thường):** `https://pokesurvivor.com/dev.html` (đặt `localStorage['psbot.dev'] = '1'` trước khi nạp `site.js`, chơi khách) để lộ `window.G`: gọi boss (`G.Game.debugTime(177)`), tìm rương (`G.World.specialsNear`), thả vùng skill (`G.Hazards.add`). Đặt `PSBot.SITE.scene = () => null` để bot đọc canvas như trên `/`. **`/dev.html` chỉ dành cho dev:** chạy thật / xác nhận cuối cùng luôn trên `https://pokesurvivor.com`.

## Bẫy đã gặp

- **Mã nguồn bản thường** công khai tại <https://github.com/JPTER78/pokesurvivor> (phục vụ pokesurvivor.com). Đọc ở đó để tìm màu/kích thước/cấu hình thay vì đoán.
- pokesurvivor.com có `<meta>` CSP chặn `<script>` chèn vào trang → **đừng chèn thẻ script / inline script, vô ích**. Đường chạy:
  - PC: extension (`world: "MAIN"`) hoặc Tampermonkey desktop.
  - Userscript (`psbot.user.js` gộp sẵn, `@grant none` + `@inject-into page`): trình quản lý tự chạy code trong trang (quyền của extension, CSP của trang không áp dụng). Android: **Firefox + Violentmonkey/Tampermonkey** (cách gộp sẵn này chưa thử trên máy thật). Bản cũ (≤ 1.6.6) tải code rồi chạy bằng `with (pageWindow)` / `GM_addElement`, xem NOTES.md mục 3b.
  - Kiwi / Edge + Tampermonkey trên Android: bản cũ **không chạy** (isolated world, không có `chrome.userScripts`, buộc phải chèn `<script>` → bị CSP chặn). Bản gộp sẵn chưa thử lại.
- Bản thường: `/dev.html` để lộ `window.G` (`SITE.scene()` đọc được), nhưng **từ 26/10 trên web nó chạy offline**: không tài khoản, không cloud, không bảng xếp hạng (`js/core/db.js`, `localReason = 'dev'`). **Đừng chuyển người chơi sang đó.** `site.js` đưa `/dev.html` về `/` (trừ `localStorage['psbot.dev'] = '1'`). Trên `/`, `G` có nhờ `hook.js` (extension / userscript); nạp muộn thì không có `G` → bot đọc canvas.
- Test bằng Chrome riêng (`--user-data-dir`): đặt profile ở **đường dẫn ngắn** (vd `C:\Users\<user>\.psbot-chrome`). Trong thư mục Temp dài, Cache Storage lỗi "Unexpected internal error" → Service Worker của game không tải được sprite → quái thành chấm tròn, bot không thấy quái. Thêm `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding` kẻo cửa sổ bị che thì rAF dừng.
- Chuỗi có `$` (regex `\$R\[`) trong lệnh shell bị hỏng → viết script ra file rồi chạy bằng `node`.
- Bản thường dùng `sizeTags: true` → `tagOf()` **không** đọc `SITE.bySize`.
- `sites/default/data.js` có nhãn `canvas:256x256#…` = `wall`. Nếu đó là mảng nền thì sẽ chặn cả vùng lớn trong A*.
- `state.view` được tạo lại mỗi frame. Dữ liệu cần sống qua các frame phải gắn vào `state`, không gắn vào `state.view` (đã từng làm quy tắc "kẹt thì bỏ mục tiêu" không bao giờ chạy).
- Doofcraft Solo chạy mô phỏng trong Web Worker, gửi frame **nhị phân**. Không giải mã, không đi hướng này.
- Một trận lẻ không đủ để kết luận thay đổi giúp sống lâu hơn (biome và thẻ ngẫu nhiên). Ví dụ thử nghiệm "thoát vây" đã gỡ, xem NOTES.md.
- Cảnh báo LF/CRLF của git là bình thường. Kiểm tra `git show --stat` để chắc không đổi cả file.
