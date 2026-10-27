# CLAUDE.md — PokeSurvivor Bot

Bot tự chơi cho 2 bản game PokeSurvivor: **pokesurvivor.com** ("bản thường", profile `default`) và **pokesurvivor.doofcraft.com** (bản viết lại, profile `doofcraft`). JS thuần, không build, không test framework. Chạy như Chrome extension MV3 (`content_scripts`, `world: "MAIN"`), hoặc qua `loader.js` / `psbot.user.js` (tải code của bản đã phát hành, nhánh `release`).

**Việc đang dở: đọc `NOTES.md` trước.** Cả 2 bản đã test trên game thật. Bản thường đọc cảnh từ `window.G` trên `/dev.html` (làm ở nhà, 26/10). Việc còn mở: NOTES.md mục 3 bước 9–11 và mục 4. Mạng nơi làm việc của người dùng chặn pokesurvivor.com: ở đó chỉ test được doofcraft và trang giả lập.

## Người dùng & cách làm việc

- Người dùng nói tiếng Việt → trả lời tiếng Việt. Chữ hiển thị trong game/panel/log (`log(...)`, `why`, tooltip) viết **tiếng Việt**; comment trong code viết **tiếng Anh**, ngắn, đúng mật độ comment xung quanh.
- **Chỉ commit/push khi người dùng bảo.**
- **Hai nhánh:**
  - **`main`:** nơi làm việc. Push thoải mái, người dùng không thấy.
  - **`release`:** bản người dùng đang dùng. `loader.js` (userscript/bookmarklet tải file bot từ đây), link ZIP trong README/`docs/index.html`, và thông báo cập nhật (`manifest.json` trên `release`) đều đọc nhánh này.
  - **Không checkout `release`.** Chỉ cập nhật nó bằng lệnh phát hành bên dưới, và **chỉ khi người dùng bảo phát hành**.
- **Phát hành:**
  1. Tăng version ở **cả** `manifest.json` và `const VERSION` trong `core/bot.js`.
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
    - Chọn mục tiêu (rift > prize (thief / shiny, chỉ có ở `scene` bản thường) > vali > buff > đồ tốt > kinh nghiệm > đá phá được > quái); bỏ mục tiêu có quái đứng sát (`crowded`), nằm trong vùng nguy hiểm (`inHazard`), hoặc khi máu thấp (`low`).
    - Nếu đường thẳng bị chặn: `planPath()` → A* (`makeGrid` / `findPath` / `lineClear`) → điểm đi tiếp `wp`.
    - `cost(dir)` chấm 16 hướng → `applyDir`.
  - `scoreCard()`: chấm thẻ lên cấp. Có build (Moveset) thì xếp theo tầng: tiến hoá 500 > move build chưa có 400 > move ngoài build khi còn ô (giữ ô cho move build chưa có; `SITE.moveSlots()` hoặc đếm thẻ "New"; bond gộp nhiều move vào 1 ô, game chỉ đưa thẻ move mới khi còn ô) 350 > Learning (tăng kinh nghiệm, `XP_RE`) 320 > nâng move tấn công build 300 > nội tại để tiến hoá 250 > nâng buff build 200 > nội tại 150/146/140 > skill ngoài build. Không có build thì dùng logic cũ. **Sửa thứ tự này thì cập nhật luôn mục "Bot chọn thẻ lên cấp thế nào" trong README.md + README.en.md.**
  - `levelUp` / `dialogRows` / `pickRow` / `tapEl` (điện thoại: bấm vào thẻ thay vì gửi phím). `autoRestart` (`state.runEnded`: `null` = chưa biết).
  - Panel, popup Moveset, danh mục F6, chạy nền, vòng lặp chính (đọc HUD: đồng hồ, máu `state.hpRatio`), gắn nhãn F7, `window.PSBot`.
- `sites/<id>/site.js` định nghĩa `window.PSBotSite = h => ({...profile})`. `h` là các helper của core (`CFG`, `state`, `visible`, `scoreCard`, `pickRow`…), được điền sau, nên chỉ dùng bên trong method. Các trường profile được giải thích trong NOTES.md mục 1.
- `sites/<id>/data.js`: nhãn sprite + build xuất từ nút "Xuất data.js" (F6). Thứ tự ưu tiên: mặc định < data.js < localStorage.
- `core/moves.js`: sinh bởi `node crawl-moves.js` (pokesurvivor.wiki). `node crawl-moves.js --evo` chỉ làm mới bảng tiến hoá (`evo`).
- Thứ tự nạp (manifest/loader): `site.js` → `data.js` → `moves.js` → `bot.js` → `farmMoney.js`. `loader.js` phải ở gốc repo.

## Kiểm tra thay đổi

1. `node --check <file>` sau mỗi lần sửa.
2. **Trang giả lập** trong `dev/harness/` (dùng chrome-devtools MCP: mở `about:blank`, `evaluate_script` với `sourcePath` lần lượt harness → `sites/default/site.js` → (`core/moves.js` nếu cần) → `core/bot.js`, rồi gọi hàm của harness):
   - `pathfinding-sim.js`: game mini có tường/vùng skill. `await __run('open'|'cup'|'cupHazardLeft'|'cupHazardRight'|'closed', ms)`. Mong đợi: `cup` lấy được trong khoảng 5s, `closed` có `ignored ≥ 1`.
   - `moveset-scoring.js`: `await __pick(ownedMoveNames, [[title, desc], …])` trả về thẻ bot chọn. Trước đó: `PSBot.play(0)`, `PSBot.setBuild(...)`.
   - `levelup-dialogs.js` (bản thường) / `levelup-doofcraft.js`: `await __scene(...)`, kiểm tra máy tính (gửi phím) và điện thoại (bấm vào thẻ; doofcraft dùng `emulate` touch).
3. **Game thật:** đăng nhập bằng `account_test.js`, nạp bot bằng `evaluate_script` theo thứ tự trên (nạp lại `bot.js` + `farmMoney.js` giữa trận cũng được, bot tự gỡ bản cũ), `PSBot.state.debug = true` (overlay F9), `PSBot.play(1)`. Gắn một `setInterval` ghi `state.view` / `hudTexts` mỗi 250ms để phân tích (ví dụ vì sao chết). Mỗi trận tốn vài phút trên tài khoản của người dùng, nên đừng chạy thừa.

## Bẫy đã gặp

- **Mã nguồn bản thường** công khai tại <https://github.com/JPTER78/pokesurvivor> (phục vụ pokesurvivor.com). Đọc ở đó để tìm màu/kích thước/cấu hình thay vì đoán.
- pokesurvivor.com có `<meta>` CSP chặn script chèn vào trang. Trên điện thoại (Kiwi + Tampermonkey) bot **không chạy được** và đây là giới hạn đã chấp nhận: **không tìm cách lách CSP của trang** (xem NOTES.md mục 3, bước 0). PC (Tampermonkey/extension) chạy bình thường.
- Bản thường: bot tự chuyển `/` → `/dev.html`, nơi game để lộ `window.G`; `SITE.scene()` đọc cảnh từ `G`, không có `G` thì đọc canvas (NOTES.md mục 3).
- Test bằng Chrome riêng (`--user-data-dir`): đặt profile ở **đường dẫn ngắn** (vd `C:\Users\<user>\.psbot-chrome`). Trong thư mục Temp dài, Cache Storage lỗi "Unexpected internal error" → Service Worker của game không tải được sprite → quái thành chấm tròn, bot không thấy quái. Thêm `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding` kẻo cửa sổ bị che thì rAF dừng.
- Chuỗi có `$` (regex `\$R\[`) trong lệnh shell bị hỏng → viết script ra file rồi chạy bằng `node`.
- Bản thường dùng `sizeTags: true` → `tagOf()` **không** đọc `SITE.bySize`.
- `sites/default/data.js` có nhãn `canvas:256x256#…` = `wall`. Nếu đó là mảng nền thì sẽ chặn cả vùng lớn trong A*.
- `state.view` được tạo lại mỗi frame. Dữ liệu cần sống qua các frame phải gắn vào `state`, không gắn vào `state.view` (đã từng làm quy tắc "kẹt thì bỏ mục tiêu" không bao giờ chạy).
- Doofcraft Solo chạy mô phỏng trong Web Worker, gửi frame **nhị phân**. Không giải mã, không đi hướng này.
- Một trận lẻ không đủ để kết luận thay đổi giúp sống lâu hơn (biome và thẻ ngẫu nhiên). Ví dụ thử nghiệm "thoát vây" đã gỡ, xem NOTES.md.
- Cảnh báo LF/CRLF của git là bình thường. Kiểm tra `git show --stat` để chắc không đổi cả file.
