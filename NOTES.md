# Ghi chú: đã làm gì, còn gì

Cập nhật: 2026-10-27 (bot v1.5.8 đã phát hành; thêm nhánh Firefox cho Android trong `psbot.user.js`, xem mục 3b). Doofcraft test ở nơi làm việc; bản thường (pokesurvivor.com) chỉ test được ở nhà, vì mạng nơi làm việc chặn trang. Tối 26/10 bản thường đã test trên game thật (đọc `window.G` trên `/dev.html`, mục 3). Còn mở: mục 3 bước 9–11, mục 3b (test trên máy Android thật), mục 4.

---

## 0. Bắt đầu một buổi làm việc

1. `git pull` để lấy bản mới nhất của `main`.
2. **Tài khoản test:** `account_test.js` nằm trong `.gitignore` nên **không có trên GitHub**. Ở nhà phải tự tạo lại (cùng định dạng `module.exports = { normal: {…}, doofcraft: {…} }`) và tuyệt đối không commit file này.
3. Nạp bot: `chrome://extensions` → Load unpacked thư mục repo, hoặc nạp trong console theo thứ tự ở mục 6.
4. Nếu làm cùng Claude: Claude Code tự đọc `CLAUDE.md` (bản đồ code, quy ước, cách test). Bảo Claude **đọc file này** rồi đi lần lượt theo mục 3.
5. **Mới (26/10):** ở mục 3 có hướng đọc dữ liệu game qua `window.G` trên `/dev.html`. **Đã làm xong tối 26/10**, xem mục 3.
6. **⚠️ 27/10: `/dev.html` trên web giờ chạy offline.** Commit `bfdd329` của repo game (26/10) thêm vào `js/core/db.js`: `if (!G.BUILT && !localhost) { localReason = 'dev'; return false; }`. Nghĩa là không tài khoản, không cloud, không bảng xếp hạng. Bot 1.5.0–1.5.6 tự chuyển người chơi sang đó. Bản 1.5.7 bỏ việc chuyển, và đưa `/dev.html` về `/` (trừ `localStorage['psbot.dev'] = '1'`).
   - Trên `/` không có `G`, nên bản thường lại đọc canvas. `scene()` vẫn giữ (chạy khi có `G`, ví dụ localhost).
   - **Việc cần làm:** nhánh canvas của bản thường còn thiếu nhiều (mục 3 bước 5–7): nhãn vùng skill/đạn, địa hình, vật thể. Lấy màu/kích thước từ mã nguồn repo game.
7. **Event Halloween bản thường** (`js/systems/halloween.js`): 30/10 đến 1/11, giờ Tây Ban Nha (theo giờ server). Không có chế độ riêng: mọi trận trong thời gian đó đều là Halloween.
   - Có: bản đồ đêm có bí ngô, thêm pokémon Ma, kẹo (`bag.candy`, chủ yếu do pokémon Ma và bí ngô rơi), shop Kecleon bán skin bằng kẹo, banner gacha Noche Espectral, phút 30 có Gengar khổng lồ thay Arceus.
   - Profile `default` có `event` (nút bấm được trong 3 ngày đó, chạy như ▶ Chạy).
   - **Chưa làm:** nhận diện kẹo / bí ngô trên canvas (chưa có dữ liệu thật).

---

## 1. Cấu trúc

- `core/`: lõi dùng chung (`bot.js`, `moves.js`, `farmMoney.js`).
- `sites/default/`: bản thường (`site.js` + `data.js`). **Mọi thứ riêng của bản thường viết vào đây.**
- `sites/doofcraft/`: doofcraft (`site.js` + `data.js`). Có thể xem làm mẫu.
- `manifest.json`, `loader.js`: chọn folder theo domain. `loader.js` phải nằm ở gốc repo vì userscript/bookmarklet tải nó từ đó.
- `crawl-moves.js`: tạo `core/moves.js` từ pokesurvivor.wiki (wiki này viết cho **bản thường**).

### Profile `site.js` có thể khai báo gì (core đọc các trường này)

| Trường | Ý nghĩa | Bản thường | Doofcraft |
|---|---|---|---|
| `tags` | Nhãn theo key chính xác (`fill:#…`, `canvas:WxH#hash`, đường dẫn ảnh) | chỉ 2 nhãn `hazard` theo kích thước | màu vật phẩm, `hazard`, `shot` |
| `sizeTags` | `true` = key dạng `canvas:WxH` (không có hash) trong `CFG.tags`/data.js áp cho mọi sprite cùng kích thước | **`true`** | `false` |
| `bySize` | Nhãn theo kích thước sprite do profile tự khai | ❌ (và **bị bỏ qua** khi `sizeTags: true`, xem `tagOf()` trong core) | đá, bẫy, cây, vật Halloween |
| `terrain(d)` | Mảng nền → 16×16 ô (0 nền, 1 tường, 2 chất lỏng) | ❌ | ✅ |
| `evolveNeeds` | Map tên move → thẻ nội tại cần để tiến hoá | ❌ (core tự dùng `evo` trong `moves.js`, lấy từ wiki) | ✅ (đọc cấu hình game) |
| `cfg` | Ghi đè `CFG` (ví dụ `caseReach`) | `caseReach: 40` | `caseReach: 45`, … |
| `scene(cam)` | Cả cảnh (quái, nguy hiểm, vật phẩm, tường, địa hình) theo nhãn, toạ độ màn hình; `null` = đọc canvas | ✅ (từ `window.G`, chỉ trên `/dev.html`) | ❌ |
| `event` | Nút chạy event trong panel: `{ label, title, available(), start(), stop() }` (mục 4b) | ❌ | ✅ (Halloween Waves) |

---

## 2. Đã xong

### 2a. Trong core: chạy cho cả 2 bản (bảng dưới viết trước khi bản thường có `G`; phần lớn đã kiểm tra ở mục 3)

| Tính năng | Bản thường cần kiểm tra gì |
|---|---|
| Tự chọn skill/đồ trên điện thoại (bấm vào thẻ khi ô số bị ẩn) | Tìm thẻ từ `div.key` bị ẩn, nếu không có thì tìm hàng thẻ giống nhau quanh `#lvl-num`. **Chưa thử trên Android thật.** |
| Chọn skill theo Moveset theo tầng: tiến hoá > move build chưa có > nâng move tấn công build > **nội tại để tiến hoá** > nâng buff build > nội tại > skill ngoài build | Dựa vào tên pokémon game vẽ lên canvas (nút 🎯 trong popup Moveset lấy được tên thì ổn). |
| Ưu tiên nội tại để tiến hoá (Power, Reflexes, Sprint, Synthesis, Armor, Magnet, Vigor) | Bản thường lấy từ `evo` trong `moves.js` (wiki, 97/103 move). Cần xác nhận **tên thẻ trên game khớp** các tên này: console phải hiện lý do "điều kiện tiến hoá …". |
| Panel: Số ván, ▶ Chạy/■ Dừng, ⚔ Moveset, dòng "F8 bật/tắt bot · F9 hiển thị overlay" | F6 danh mục, F7 gắn nhãn vẫn còn. |
| Tìm đường A* vòng qua vật cản, nhớ điểm kẹt cả trận, bỏ qua mục tiêu không tới được 20s | Bản thường chỉ biết vật cản qua nhãn `wall` (data.js/F6) và điểm đã kẹt (chưa có `terrain`). |
| Né đạn quái theo đường bay (`shot`), vùng skill (`hazard`), không nhặt đồ trong vùng nguy hiểm | Bản thường **chưa có nhãn đúng màu** cho đạn/vùng skill, chỉ có đoán "hình đỏ không nhãn = nguy hiểm" (`autoTelegraph`). |
| Nhãn `break` (Phá được, phím 8 ở F7): đứng cạnh để skill phá, phá đá gần trước khi nhặt kinh nghiệm | Chưa gắn cho vật nào. |
| Không nhặt đồ có quái đứng sát; **máu < 50% thì chế độ thủ** | Máu đọc từ chữ dạng `123 / 208` game vẽ lên canvas. **Phải kiểm tra bản thường có vẽ chữ này không**, nếu không thì chế độ thủ không bao giờ bật. |
| Nhận diện chính mình theo số dex trong đường dẫn sprite (không tính sprite ra đòn của mình là quái) | Regex lấy dex: `/\/(\d+)\//`. Bản thường dùng `/assets/pokemon/<dex>/…` nên chắc khớp. Kiểm tra `PSBot.state.selfDex` đúng số pokémon. |
| Đếm ván đúng khi bấm Chạy giữa trận / ở màn hình kết quả | Dựa vào chữ "You fell / run over / game over…". |

### 2b. Chỉ có ở doofcraft (`sites/doofcraft/site.js`): bản thường lấy các thứ này từ `G` (`scene()`), nhánh canvas của bản thường vẫn chưa có

- **Địa hình:** đọc 22 bảng màu biome từ mã nguồn game, phân loại từng ô của mảng nền 256×256 thành tường (chặn) / chất lỏng (tốn điểm) / nền.
- **Nhãn theo màu của game:** `fill:#ff2445` là mọi vùng skill quái/boss (`hazard`), `fill:rgba(255,60,80,0.35)` là vòng đỏ dưới mỗi viên đạn quái (`shot`).
- **`bySize`** (lấy từ các hàm vẽ sprite của game): `22x17` đá (`break`), `14x14` bẫy (`hazard`), cây là tường (`30x40` rừng, `26x40` pha lê, `28x40` cây chết), Halloween `8x23` đèn lồng / `24x28` lồng / `6x20` cọc rào là tường, `14x11` bí ngô là `break`. Hàng rào `16x14` trùng kích thước rương nên không gắn.
- **`evolveNeeds`** đọc từ cấu hình game (86 move). Trận thật: Hyper Beam và Psychic đều tiến hoá.
- **Rương cứng:** `caseReach: 45`.
- **Điện thoại:** bấm thẳng `button.ps-card` khi màn hình cảm ứng.

### 2c. Cách đã làm ra các thông tin của doofcraft (làm lại y hệt cho bản thường)

Mọi "id" của doofcraft đều lấy từ **mã nguồn JS của game**, không đoán bằng hình:
1. Lấy danh sách file JS: trong console trang game, `[...document.scripts].map(s => s.src)`; file `index-*.js` liệt kê các file con.
2. `fetch` từng file rồi tìm theo từ khoá:
   - **Vùng skill:** hàm vẽ cảnh báo (doofcraft: `drawHazards` → `Qs`, `fillStyle` cố định).
   - **Đạn quái:** `drawProjectiles`, phần `friendly === false`.
   - **Kích thước sprite vật thể:** các hàm `Y(w,h)` tạo canvas (`rock`, `tree`, `chest`…).
   - **Bảng màu nền:** `palette:{…}`. **Cấu hình:** `props:{tree:{solid…`, `evolution:{requires…`.
3. Đối chiếu bằng overlay (F9) và `PSBot.state.lastFrame` trong trận thật.

Bản thường có thể đóng gói khác, nhưng cách tìm giống vậy. Script thu dữ liệu ở mục 7 giúp biết ngay game vẽ những gì.

---

## 3. Checklist cho bản thường (làm theo thứ tự)

0. [x] **Bản thường trên điện thoại không chạy bot (CSP): ĐÃ RÕ NGUYÊN NHÂN — Android giờ chạy qua Firefox, xem mục 3b.**
   - **Nguyên nhân:** `index.html` của pokesurvivor.com có `<meta http-equiv="Content-Security-Policy" content="script-src 'self' file: https://www.gstatic.com https://apis.google.com https://*.firebaseio.com https://*.firebasedatabase.app; …">`, chặn mọi script chèn vào trang. Tampermonkey trên Chrome PC (userScripts API) vẫn chạy được, còn Tampermonkey trong Kiwi thì không. Dòng trạng thái báo "trang không chạy được code bot". Doofcraft không có CSP nên chạy được.
   - **Đã loại trừ:** thiếu canvas `#game` (có, 1001×563); quyền `raw.githubusercontent.com` (đã cho phép, file tải về được); toàn màn hình.
   - **Đã thử, không giúp:**
     - Userscript 1.4.0 chèn bản lưu sẵn ở `document-start` (trước khi đọc thẻ meta).
     - Bật Inject Mode "Tức thì" của Tampermonkey.
   - **Quyết định (đổi ngày 27/10):** **bỏ hẳn việc chèn `<script>`/inline script** (vô ích, CSP chặn). Trên Android chuyển sang **Firefox + Violentmonkey/Tampermonkey**: `psbot.user.js` lấy `window` của trang qua `unsafeWindow`/`wrappedJSObject` rồi bọc code trong `with (pageWindow)`. Code chạy bằng **quyền của extension**, CSP của trang không áp dụng cho nó — không phải lách CSP và không dựa vào lỗ hổng nào của trang. Chi tiết + cách test: **mục 3b**.
   - **Đã thử và không dùng được:** Microsoft Edge / Kiwi + Tampermonkey trên Android (Chromium: isolated world, không có `chrome.userScripts`, buộc phải chèn `<script>` → CSP chặn). iOS (Safari + Userscripts) **chưa thử**; ở đó `psbot.user.js` đi nhánh dự phòng (`loader.js` + `<script>` inline) nên bản thường nhiều khả năng vẫn bị chặn, doofcraft thì có thể chạy.
   - **Cũng đã thêm** (vẫn giữ, vô hại): `ready()`/`canvas()` của bản thường lấy canvas lớn nhất khi không có `#game`; panel chuyển vào phần tử toàn màn hình; panel ở `z-index` cao nhất; dòng trạng thái "PSBot: …" khi đang tải.
   - **Mã nguồn bản thường công khai:** <https://github.com/JPTER78/pokesurvivor> (repo phục vụ pokesurvivor.com, nhánh `main`, file `index.html` + `js/…`). **Dùng repo này cho checklist bên dưới** (màu vùng skill/đạn, kích thước sprite vật thể, cấu hình tiến hoá…), không cần vào được trang game.
   **Hướng mới (thử trước mục 1): đọc dữ liệu game qua `window.G` thay vì đoán từ canvas.** Nguồn: userscript "PokéSurvivor Ultimate Trainer & HUD" (greasyfork.org/scripts/600697, tác giả Rekcheli, v2.6.3). Đây là tool cheat, chức năng không liên quan bot mình; chỉ học **cách truy cập game**.
   - **Cách họ làm:** khi mở `pokesurvivor.com/`, script chuyển sang **`/dev.html`** (bản dev của game) rồi `history.replaceState` về `/` cho thanh địa chỉ trông bình thường. Trang dev để lộ cả game ra `window.G`. Trang thường (`/`) có lẽ không có `G`, cần kiểm tra lại.
   - **Những gì họ đọc được (chưa kiểm chứng; đối chiếu với repo JPTER78/pokesurvivor):**
     - **Người chơi:** `G.Game.player`, có `x`, `y`, `magnet`, máu, chỉ số. `G.Game.state` là trạng thái trận.
     - **Quái:** `G.EnemyMgr.all()`, mỗi con có `x`, `y`, `boss`, `behavior` (`'thief'`…), `dead`.
     - **Vùng skill:** họ bọc `G.Hazards.add`, mỗi vùng có `x`, `y`, `r`, `angle`.
     - **Đạn:** `G.Projectiles.all()`.
     - **Rương, đá, vật đặc biệt:** `G.World.specialsNear(x, y, tầm)`.
     - **Va chạm, địa hình:** `G.World.collide(entity)`, `G.World.liquidEffect`.
     - **Rift:** `G.Rift.rift`, `G.Rift.inArena`. **Camera:** `G.Camera`.
     - **Thẻ lên cấp:** bọc `G.LevelUp.offer` để lấy mảng thẻ. `card.key` là `'stat:<id>'` cho thẻ chỉ số, còn lại là move. Chọn thẻ bằng `G.RunUI.pick(index)`; họ chờ 1,5s trước khi gọi, có lẽ để giao diện kịp hiện.
     - **Move:** `G.Moves.BY_ID`, `G.Moves.evolve`, `G.Moves.levelUp`. **Pokédex:** `G.DEX`.
   - **ĐÃ LÀM (26/10 tối, ở nhà):**
     1. `/dev.html` có `window.G` đầy đủ (các tên ở trên đều đúng, thêm `G.World.isWall/isLiquid/visibleProps`, `G.Hazards.all/inside`, `G.Pickups.all`). Trang `/` nạp `app.min.js` bị obfuscate: **không có `G`**. Cả hai trang đều có CSP.
     2. `sites/default/site.js` có `scene(cam)`: khi có `G` thì trả về quái, vùng skill (`zone` tròn / `beam` chữ nhật), đạn quái (đường bay theo `vx/vy`), bẫy, kinh nghiệm, vật phẩm, rương lớn (`case`), đền (`buff`), rift, cây + đá + rương nhỏ (`wall`), ô tường / chất lỏng (`terrain`, lava/độc tính là tường), toạ độ màn hình theo camera của bot. Core (`tick`) dùng `scene` thay cho phân loại sprite; không có `G` thì đọc canvas như cũ. Quái khắc hệ (`G.Types.mult` > 1) tính to hơn để né xa hơn; vật phẩm/đền/rương chỉ lấy trong khung camera (lấy cả bản đồ thì bot chạy khắp nơi).
     3. **Người dùng chọn tự chuyển:** `site.js` chuyển `/` → `/dev.html` (HEAD kiểm tra trước, trang bị gỡ thì ở lại `/`). Tắt: `localStorage['psbot.dev'] = '0'`. Không `replaceState` giấu địa chỉ.
     4. Thẻ lên cấp vẫn đọc DOM (đủ dùng), không dùng `G.LevelUp`.
   - **Kết quả (Scorbunny cấp 1, tài khoản test chưa nâng cấp gì):** trước khi sửa 1:44 (canvas). Sau khi sửa: `G` 1:34 / 1:31 / 1:50, canvas 2:01. Chết chủ yếu do bị quái vây, quái nước gây 31–49/92 máu mỗi lần chạm. Chưa đủ trận để nói nhánh nào tốt hơn.
   - **Giấy phép:** script của họ là PolyForm Noncommercial, repo mình là MIT, nên **không chép code của họ**. Tên các object của game là sự thật về game, dùng được.
   - **Không làm** các chức năng cheat của họ: sửa save (`G.DB.save`, xu, vé, mở dex), godmode, xuyên tường.

1. [x] **Chạy thử bot như hiện tại:** chạy, chọn skill, không lỗi đỏ. Đã sửa các lỗi tìm thấy:
   - **Tên thẻ đọc nhầm thành mô tả:** tiêu đề nằm trong `.nm` cùng chip `<span class="tag-chip">`, nên `.nm` không phải phần tử "lá". `readCard` giờ lấy text riêng của phần tử. Build/tiến hoá trước đây không khớp tên nào.
   - **Popup "Link my Gmail" / "Got it"** chặn tự chơi lại: thêm `not now|got it|…` vào `restartSteps`.
   - **Chạy nền hỏng trên bản thường:** CSP chặn Worker `blob:` bằng sự kiện `error` (không ném lỗi), nên không rơi vào nhánh dự phòng. Đã bắt `onerror` → `setInterval`.
   - **Core:** bỏ mục tiêu nhặt nếu đường thẳng tới nó đi sát quái (`inLane`); `cost()` xét quái ở cả nửa bước.
   - **Rift ưu tiên tuyệt đối (cả 2 bản):** không bị loại vì vùng skill / quái quanh nó, `riftWeight` 8 → 40 (`farmMoney.js` từng ghi đè thành 10, đã bỏ), kẹt thì chỉ thoát chứ không bỏ rift, không có đường thì bỏ 3s (`riftIgnore`). Bản thường thấy rift trong bán kính 2500 (cả ngoài màn hình). Test bằng `G.Rift.onEvent(['rift', x, y, 60])` + 3 vùng skill vô hại chắn đường: logic cũ vào sau 12,3s (bỏ rift 5 lần), mới 5,6s / 6,2s (không bỏ lần nào).
   - **Ý tưởng từ "Ultimate Trainer" (chỉ ý tưởng, không chép code — PolyForm NC):** nhãn `prize` mới trong core (sau rift, trước vali; `prizeWeight`). Bản thường: thief (`behavior === 'thief'`, không gây sát thương, chạy trốn, mất sau 15s, rơi 100 xu hoặc vé ×10) chỉ là prize, không tính là quái; quái shiny (hạ là bắt được) vừa là quái vừa là prize `engage`. Rương lớn thấy được trong bán kính 1200 (ngoài màn hình). Test: `G.Events.debugThief()` → bot đuổi suốt và hạ được Gholdengo; `makeShiny()` → bot nhắm ngay. Thẻ **Learning** (+% kinh nghiệm) 320 điểm.
   - **Overlay F9:** dòng thông số chỉ hiện khi bật F9 / F7, xuống dòng theo bề ngang panel; đường bay của đạn vẽ nét mảnh (trước vẽ bằng bề rộng vùng né, che kín màn hình).
2. [x] ~~Thu dữ liệu canvas~~: không cần, có `G`.
3. [x] **Máu trên HUD:** `hpRatio` khớp `G.Game.player.hp/maxHp` 100%.
4. [x] **Tự nhận diện:** `selfDex` đúng (813). Nhánh `G` lấy thẳng `player.dex`.
5. [x] **Vùng skill và đạn quái:** lấy từ `G` (nhánh canvas vẫn chỉ có `autoTelegraph`).
6. [x] **Địa hình:** lấy từ `G.World` (nhánh canvas vẫn chưa có; nhãn `canvas:256x256` trong data.js chưa kiểm tra).
7. [x] **Vật thể:** lấy từ `G.World.visibleProps` (nhánh canvas chưa có).
8. [x] **Vali:** rương lớn (`bigchest`) là vật rắn, mở trong ~48 đơn vị (`interact.js`), nên `caseReach: 40` (25 thì không bao giờ tới vì bị va chạm chặn ở ~25).
9. [ ] **Tiến hoá:** chưa thấy thẻ tiến hoá trong các trận ngắn (chết trước khi max skill). Cần tài khoản có pokémon mạnh hơn hoặc trận dài hơn.
10. [x] **Điện thoại (Android):** đã thêm nhánh Firefox trong `psbot.user.js` — **cần test trên máy thật**, xem mục 3b. Kiwi/Chromium không chạy được (CSP). **iOS** (Safari + app Userscripts) **chưa thử**; ở đó `psbot.user.js` đi đường dự phòng (`fetch` loader + `<script>` inline) nên bản thường nhiều khả năng vẫn bị chặn; doofcraft thì có thể chạy.
11. [ ] **Đo kết quả:** đếm log "không có đường tới mục tiêu" (mong đợi vài lần mỗi phút, không ra cả loạt), ghi thời gian sống mỗi trận.
12. [x] **Phát hành:** đã phát hành 1.5.0 → 1.5.8 (26–27/10). Lần sau (chỉ khi người dùng bảo):
    1. Tăng version ở **cả** `manifest.json` lẫn `VERSION` trong `core/bot.js`.
    2. Commit trên `main`.
    3. `git tag vX.Y.Z && git push origin main main:release --tags`.

    Người dùng chỉ nhận code từ nhánh `release`, nên push `main` lúc đang làm không ảnh hưởng gì. Chi tiết trong `CLAUDE.md`.

### 3b. Android: nhánh Firefox trong `psbot.user.js` (27/10, **chưa test trên máy thật**)

**Vì sao trước đây không chạy:** Kiwi/Chrome trên Android là Chromium. Userscript chạy trong **isolated world**, muốn chạm vào JS của trang thì Tampermonkey buộc phải chèn `<script>` — đúng thứ CSP `script-src 'self'` chặn. Kiwi không có `chrome.userScripts` nên không có đường nào khác.

**Cách chạy mới:** Firefox cho userscript lấy `window` thật của trang qua `unsafeWindow` / `wrappedJSObject`. `psbot.user.js` giờ có 3 nhánh:

1. **Firefox (Gecko)** — nhận ra bằng `navigator.userAgent` có `Gecko/` và không có `Chrome/`:
   - tải 5 file như cũ (`GM_xmlhttpRequest`, không qua CORS/CSP);
   - chạy **một lần** `new Function('W', 'with (W) { …code… }')(pageWindow)`;
   - nhờ `with (W)`, mọi global trong code (`window`, `document`, `CanvasRenderingContext2D`, `XMLHttpRequest`, `KeyboardEvent`, `firebase`…) là object của **chính trang**, nên hook canvas + gửi phím chạy y như extension trên PC. `new Function` tạo hàm non-strict nên `with` hợp lệ;
   - code chạy bằng **quyền của userscript**, không phải script của trang → CSP không áp dụng. Không sửa CSP, không khai thác lỗi của trang;
   - `PSBotSite` không lên sau khi chạy → hiện dòng "trình duyệt này chặn script chèn vào trang…".
2. **Chromium desktop** — giữ nguyên `GM_addElement` (API của extension, không qua CSP).
3. **Còn lại** — `loader.js` + `<script>` inline, chỉ dùng được khi trang không có CSP (doofcraft).

**Cài trên Android:** Firefox (CH Play) → Violentmonkey hoặc Tampermonkey → mở `https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js` → **Install** → cho phép `raw.githubusercontent.com` → mở game. Doofcraft chạy được ở cả Kiwi và Firefox.

**Giới hạn:**
- **Kiwi / Chrome Android vẫn không chạy** (CSP). Muốn thì phải cài extension `.crx` có `world: "MAIN"` — chưa làm, và Android không có "Load unpacked".
- `Worker` tạo từ `blob:` vẫn bị CSP chặn → chế độ chạy nền rơi về `setInterval` (điện thoại đang mở tab thì không ảnh hưởng).
- Panel/log của bot là tiếng Việt; điện thoại không có F8/F9, dùng nút ▶ Chạy trên panel.

**Cần kiểm tra trên máy thật:**
1. Panel hiện ở góc trên trái (không còn dòng "chặn script").
2. Vào trận: `PSBot.state.lastFrame.length` > 0 (nếu 0 → hook không vào được prototype; xem console có `Permission denied`/`Xray`).
3. Bot tự đi, tự nhặt đồ, tự chọn thẻ (bấm vào thẻ — nhánh điện thoại của `site.js`).
4. Chơi lại tự động sau khi chết.
Nếu bước 2 hỏng: thử đổi manager (Violentmonkey ↔ Tampermonkey) và gửi log console.

---

## 4. Vấn đề còn mở (doofcraft)

- **Thời gian sống** (Mewtwo của tài khoản test):
  - Trước khi sửa: 3:55–4:13 (3 trận). Nguyên nhân: lao vào bầy quái để nhặt kinh nghiệm, và tính nhầm chính mình là quái.
  - Sau khi sửa: 7:34, 7:08. Có thêm tiến hoá và cây theo biome: 5:27, **10:18** (hạ boss Thundurus, Lunala).
  - Kết quả dao động nhiều theo biome và theo thẻ game đưa ra.
  - 27/10 (bot 1.5.4, Mewtwo): **13:55** (hạ Kyogre, Urshifu, Deoxys; Psychic tiến hoá). Chết vì Greninja đánh 100% → 0 trong 3s, bot vẫn nhắm đánh nó ở 27% máu.
  - Sửa sau trận đó (chưa phát hành): mất ≥ 25% máu trong 2s thì tính là máu thấp thêm 4s (`hurtDrop/hurtWindow/hurtHold`); máu thấp thì không chủ động đi đánh quái. Trận thử: 6:47, chết vì bị 40–60 quái vây (xem dòng dưới). Chưa đủ trận để đánh giá.
- **Đợt quái ập đến** (từ 25 lên 85 con trong 3 giây) vẫn là nguyên nhân chết chính.
- **Kẹt tường (sửa 27/10, sau 1.5.5).** Người dùng báo bot hay kẹt ở tường địa hình lớn (lưới tím F9).
  - **Nguyên nhân 1:** `cost()` (chấm 16 hướng mỗi frame) không biết ô tường địa hình; chỉ A* biết. Khi né skill/quái, bot đi thẳng vào tường.
  - **Nguyên nhân 2:** điểm đi tiếp `wp` chỉ kiểm tra tâm, nên thân cạ góc tường → bị tính là kẹt → thoát theo hướng ngẫu nhiên (lực thoát yếu hơn né skill) → lại vào tường.
  - **Nguyên nhân 3:** đứng lắc qua lại chờ skill, hoặc bảng lên cấp vừa mở (game dừng, mà phải 1,5 s bot mới biết), cũng bị tính là kẹt. Mỗi lần như vậy để lại một điểm "tường" giữ suốt trận, chặn A* ở chỗ trống.
  - **Sửa:**
    - `cost()` phạt bước đâm vào ô tường: sát thân +60, giữa bước +20, cuối bước +6.
    - Lực thoát kẹt 8 → 40 (hơn né skill).
    - `lineClear(…, pad)` kiểm tra cả bề ngang thân khi chọn `wp`.
    - Chỉ tính kẹt khi tổng quãng đi < 12 (không phải lắc), và không tính khi `SITE.choiceOpen()`.
  - **Test:**
    - Trang giả lập, cảnh mới `pocket` (tường địa hình hình túi, skill nhấp nháy ở cửa): trước 0/3 lần lấy được, đâm tường 8–335 frame; sau 4/4 lần trong ~3,6 s, 0 frame. Các cảnh cũ vẫn đạt.
    - Doofcraft Waves (Mewtwo), mỗi bên 1 trận: trước chết 6:31, 53 lần thoát kẹt, 57 điểm tường học được; sau chết 8:48, 13 lần thoát, 11 điểm.
- Log "chọn đồ" / "bond" lặp 2–3 lần mỗi bảng (bảng còn hiện sau lần bấm đầu, `pickAt` chỉ chờ 800ms). Chọn vẫn đúng, chưa sửa.
- **Đã thử và gỡ: chế độ "thoát vây".** Từ 12 quái trong vòng 220 đơn vị thì chạy về hướng thưa nhất. 1 trận chết ở 5:35, sớm hơn bản không có nó. Nếu thử lại: chỉ bật khi máu thấp, hoặc ưu tiên hạ quái nhanh thay vì chạy.
- `sites/doofcraft/data.js` là bản sao data.js của bản thường. Có thể dọn các nhãn không dùng.

### 4b. Event Halloween (doofcraft, chế độ Waves), bắt đầu 27/10, còn khoảng 6 ngày

**Đã làm:**
- **Nút "🎃 Event Halloween"** dưới hàng ▶ Chạy / ⚔ Moveset.
  - Profile `sites/doofcraft/site.js` khai báo `event` (`label`, `title`, `available`, `start`, `stop`). Core (`renderCtl`) chỉ vẽ nút khi profile có `event`, nên bản thường không có nút.
  - Nút chỉ hiện sau khi bot đã thấy thẻ event trên menu (`[data-testid="event-card-play"]`). Nạp bot giữa trận thì phải về menu một lần nút mới hiện.
  - Bấm nút: lưu `localStorage['ps.runMode']` cũ, đặt thành `'waves'`, bấm thẻ event nếu đang ở menu, rồi chạy như ▶ Chạy. Chơi lại (Solo → Play) tự giữ chế độ waves.
  - Bot tắt (bấm dừng, hoặc chạy đủ số ván) thì trả `ps.runMode` về như cũ; đã kiểm tra trên game thật.
  - Đang chạy event thì ▶ Chạy bị khoá, và ngược lại.
- **Rương giữa vòng** (tiêu đề "Chest"): ưu tiên Upgrade move trong build > Rare Candy > Upgrade khác > Tickets (`otherChoice`). **Chưa kiểm chứng:** trận thứ 2 không gặp rương. Trận 1 gặp 2 lần, khi đó bot vẫn chọn ô đầu (Rare Candy).

**Luật (từ mã nguồn game và cấu hình server trả về ở `POST /api/runs/start`):**
- **Vòng:** các vòng nối tiếp không có điểm dừng, mỗi vòng 50 giây, tối đa 45 quái cùng lúc.
  - Số quái mỗi vòng: 20 (vòng 1) → 36 (vòng 5) → 55 (vòng 10) → 100 (vòng 25).
  - Có rift legendary mỗi 5 vòng, boss mỗi 25 vòng (Mega Darkrai, hạ được 60 candy corn).
  - Qua vòng thì thẻ lên cấp hiếm hơn. Từ vòng 10 có Z-move, từ vòng 20 có Mega.
- **Vòng bầy ma** (cứ 4 vòng): số quái ×2,2, tốc độ ×1,45, máu ×0,3, sát thương ×0,6.
- **Mục tiêu phụ** (1–2 cái mỗi vòng, từ vòng 4 có cái thứ 2). Phần thưởng: rương 45%, candy corn 35%, vé 20%.
  - **Cage:** 1–2 lồng, đứng trong 56 đơn vị suốt 6 giây; có phục kích 4 quái.
  - **Lanterns:** 4 đèn, đứng trong 48 đơn vị mỗi đèn 1,5 giây.
  - **Doors:** 3 cửa, mỗi cửa 1 giây trong 44 đơn vị. 60% là treat (buff, candy corn hoặc rương), 40% là trick (phục kích hoặc debuff).
  - **Escort:** dẫn pokémon lạc về nhà nguyện trong 120 giây.
  - Tiến độ tụt dần khi rời khỏi vật.
- **Candy corn:** quái rơi với tỉ lệ 2%, boss rơi 5. Dùng để đổi pokémon và nền thẻ trong Halloween Shop.

**Cách game vẽ (để làm mục tiêu phụ sau này)**, theo `drawHalloweenProp` trong `route-tip-*.js`:
- Cửa đang mở: quầng radial gradient `rgba(255,170,60,0.9)` bán kính 46, kèm chữ "?" màu `#ffb347` phía trên.
- Đèn đang tắt (cần thắp): quầng `rgba(160,190,255,0.7)` bán kính 22. Đèn đã sáng: `rgba(255,200,90,0.85)` bán kính 34.
- Lồng đang nhốt: vẽ sprite pokémon (`/sprites/<dex>/Idle.png`) bên trong rồi chồng song sắt lên. Bot đang coi con này là quái, phải loại ra.
- Vòng tiến độ khi đứng cạnh: `arc` bán kính 26; màu `#ffd25a` cho đèn, `#7dffb0` cho lồng.
- Bảng nhiệm vụ góc phải ("Free the caged Pokémon 0/2", "Light the lanterns 0/4", "Trick-or-treat 0/3") và mũi tên chỉ hướng kèm khoảng cách đều vẽ trên canvas, bot đọc được trong `hudTexts`.

**Network / memory (trận waves):**
- Cùng API với trận thường: `POST /api/runs/start` có thêm `{"waves": true}`, rồi khoảng 30 giây một lần `POST /api/runs/checkpoint`. Không thấy request bảng xếp hạng event trong trận.
- Heap JS khoảng 44 MB lúc 8 phút, console không có lỗi (chỉ cảnh báo `getImageData`).

**Kết quả (Mewtwo, tài khoản test):**
- Trận 1 chết ở vòng 8 (8:59): bị 7–15 quái vây, máu tụt dần trong 18 giây.
- Trận 2 chết ở vòng 4 (2:14), vòng bầy ma: 70 con, máu từ 100% về 0 trong 7 giây.

**Việc tiếp theo:**
1. Kiểm chứng chấm điểm rương.
2. Mục tiêu phụ: nhận ra cửa / đèn / lồng đang hoạt động (theo màu ở trên), đứng cạnh đủ thời gian. Có thể dùng cơ chế `case` + `caseTime` sẵn có.
3. Vòng bầy ma: né tốt hơn (quái nhanh, đông).

---

## 5. Trang giả lập để test

`dev/harness/` có 4 trang giả lập đã dùng để test (bảng lên cấp máy tính/điện thoại cho cả 2 bản, chấm điểm Moveset, game mini có tường/vùng skill để thử A*). Cách dùng ghi trong `CLAUDE.md` (mục "Kiểm tra thay đổi").

---

## 6. Nạp bot bằng console (khi không dùng extension)

Nạp theo thứ tự: `sites/<bản>/site.js` → `sites/<bản>/data.js` → `core/moves.js` → `core/bot.js` → `core/farmMoney.js`. Sau đó `PSBot.state.debug = true` (overlay) và `PSBot.play(1)`.

---

## 7. Script thu dữ liệu (chạy trong console, khi đang trong trận và bot đang bật)

```js
(async () => {
  if (!window.PSBot) return console.warn('[probe] Bật bot trước (extension/userscript) rồi chạy lại khi đang trong trận');
  const { state, SITE, CFG } = PSBot, r = n => Math.round(n);
  const by = {};
  let last = [];
  for (let i = 0; i < 5; i++) {
    await new Promise(res => setTimeout(res, 1000));
    last = state.lastFrame;
    for (const d of last) {
      const g = by[d.src] ||= { src: d.src, kind: d.shape || (d.src.startsWith('arc:') ? 'arc' : 'sprite'), tag: CFG.tags[d.src] || '', world: 0, hud: 0, sizes: {}, alpha: d.alpha };
      SITE.isWorld(d) ? g.world++ : g.hud++;
      const s = `${r(Math.abs(d.w / d.s))}x${r(Math.abs(d.h / d.s))}`; g.sizes[s] = (g.sizes[s] || 0) + 1;
    }
  }
  const canvas = SITE.canvas() || document.createElement('canvas');
  let shot = null;
  try { shot = canvas.toDataURL('image/jpeg', 0.6); } catch (e) { shot = String(e); }
  const data = {
    site: SITE.id, url: location.href, at: new Date().toISOString(), ua: navigator.userAgent,
    canvas: { w: canvas.width, h: canvas.height }, hud: [...state.hudTexts], magnet: r(state.magnet),
    me: state.view && { x: r(state.view.me.x), y: r(state.view.me.y), s: state.view.s },
    sources: Object.values(by).sort((a, b) => b.world - a.world),
    frame: last.filter(SITE.isWorld).slice(0, 2000).map(d => ({ src: d.src, x: r(d.x), y: r(d.y), w: r(d.w), h: r(d.h), s: +d.s.toFixed(3), e: r(d.e), f: r(d.f),
      ...(d.pts ? { shape: d.shape, pts: d.pts.slice(0, 16).map(p => [r(p.x), r(p.y)]) } : {}) })),
    tags: CFG.tags, shot,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = `psbot-probe-${SITE.id}-${Date.now()}.json`;
  a.click();
  console.log('[probe] đã tải file', a.download, '—', data.sources.length, 'loại lệnh vẽ,', data.frame.length, 'vật trong frame cuối');
})();
```
