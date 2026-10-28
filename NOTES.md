# Ghi chú: đã làm gì, còn gì

Cập nhật: 2026-10-28 (`G` trên `/` nhờ `hook.js`, `psbot.user.js` gộp sẵn: mục 0 bước 8, chưa phát hành). Trước đó 27/10: bot v1.6.3 đã phát hành; thêm nhánh Firefox cho Android trong `psbot.user.js`, xem mục 3b. Doofcraft test ở nơi làm việc; bản thường (pokesurvivor.com) chỉ test được ở nhà, vì mạng nơi làm việc chặn trang. Tối 26/10 bản thường đã test trên game thật (đọc `window.G` trên `/dev.html`, mục 3). Còn mở: mục 3 bước 9–11, mục 3b (test trên máy Android thật), mục 4.

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
8. **Mới (28/10): `G` trên `/` + userscript gộp sẵn, học từ `OtherTool/pokesurvivor-autofarm`** (BoundlessEgret, MIT; thư mục này không commit). Người dùng thấy tool đó chạy tốt hơn và chạy được trên điện thoại.
   - **Vì sao nó tốt hơn:** nó không đọc canvas. Ở `document_start` nó đặt setter tạm `Object.prototype.Game`, bắt object nội bộ `ns` của game (chính là `G` của `/dev.html`) ngay trên `/` có tài khoản. Mình làm y vậy trong `sites/default/hook.js` (gán `window.G`), nên `scene()` chạy lại trên `/`.
   - **Vì sao nó chạy trên điện thoại:** toàn bộ code nằm trong file userscript (`@grant none`, `@inject-into page`), trình quản lý tự chạy code trong trang. Mình làm y vậy: `psbot.user.js` giờ sinh bởi `node build-userscript.js`.
   - Thêm: không gửi bảng xếp hạng khi bot chạy (bật sẵn, checkbox trên panel).
   - **Cần test trên game thật:** `!!window.G` và `PSBot.SITE.scene()` khác `null` trên `/` khi đã đăng nhập (tên module trên `/` có thể khác `/dev.html`); trận chạy bình thường; ván bot chơi không gửi bảng xếp hạng. Userscript trên Firefox Android (và thử Edge/Kiwi) trên máy thật.
   - **Giai đoạn 2 (28/10, đã làm, chưa test trên game thật):** `sites/default/pilot.js` = bộ lái của tool đó (xem CLAUDE.md). Người dùng: "sống càng lâu càng nhiều tiền" (xu cuối trận = `(giây/5 + quái×0,25 + boss×80 + xu nhặt) × coinMul`, `js/game.js` endRun), nên mục tiêu là thời gian sống, không phải `farmMoney.js`. Đã test trên `G` giả (scratchpad): đi tới đồ, né quái khi máu thấp, thoát vùng skill, orb khi bị vây, luật thẻ. **Không lấy:** tự mua nâng cấp / gacha / đổi partner (sửa thẳng save).
   - **Khác tool đó, giữ của mình:** đổi ô move liên tục (E): game ép đồng hồ về ≤ 35% cooldown khi đổi ô (`player.js` setActive), nên các move ở ô riêng đều bắn (chậm ~1,4 lần với 4 ô) thay vì chỉ 1 ô; trừ move `orbit` (đổi ô xoá orb của nó) → pilot giữ ô tốt nhất. Chọn thẻ theo Moveset (+ 3 luật trên).
   - **Điện thoại (28/10):** 1.6.7 trên điện thoại hiện panel nhưng bấm ▶ lúc chạy lúc không. Chưa xem được log trên máy. Nghi: `autoRestart` tìm nút theo chữ + `elementsFromPoint` (zoom / xoay / cuộn trên điện thoại làm lệch), hộp thoại nhận theo chữ tiếng Anh, chọn thẻ bằng đoán bố cục DOM. Đã chuyển hết sang id / API của game như tool kia (CLAUDE.md, mục `pilot.js`). Dòng "Đọc game: có/không" trên panel để biết hook có bắt được `G` không (nếu "không" thì `document-start` trên máy đó chạy muộn hơn game). **Cần test trên máy thật.**
   - **Doofcraft (28/10):** không có `G` (mô phỏng chạy trong Worker), nên không có pilot. Đã áp phần dùng được: luật thẻ sống sót qua `cardFacts` (Armor +0,1 defence, cap 2 → 20 thẻ; Sitrus Berry; lấy từ config game), thứ tự đồ cầm, ngưỡng reroll, tìm nút chơi lại theo `data-testid` không qua hit-test. Test trên harness doofcraft, **chưa chạy trận thật**.
   - **Đo:** so thời gian sống trung bình nhiều trận (HUD của `farmMoney.js` ghi theo version) giữa 1.6.7 (canvas) và bản có pilot; ghi lại ở đây.
   - Harness `pathfinding-sim.js`: `cup` không tới đích trong 8 s **cả ở 1.6.6** (lệch với mức mong đợi trong CLAUDE.md từ trước, không do pilot).
   - `blockRank` (core, chặn ghi Firestore/RTDB có "rank" mọi lúc kể cả bot tắt) trùng với noRank mới trong `site.js`; chưa gỡ, chờ người dùng quyết.

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
| `terrain(d)` | Mảng nền → 16×16 ô (0 nền, 1 tường, 2 chất lỏng) | ✅ (bảng màu 25 biome chép từ `js/world/tiles.js`, dùng khi không có `G`) | ✅ |
| `propFoot` | Vùng chặn của vật thể `wall`/`break`: hình tròn bán kính `r`, cách đáy sprite `up` (đơn vị world); không có thì core đoán theo hình | ✅ `{ up: 2, r: 13 }` | ❌ |
| `bossAura(src)` | Hình (rộng ≥ 40 world) vẽ dưới chân boss → quái gần nhất có `.boss`: bị đẩy ra trong `CFG.bossRange` (170) tính từ chân, đánh từ `CFG.bossEngage` (210); hình đó không tính là XP | ✅ `fill:#ffd95e` / `#ff4a4a` | ❌ |
| `hazardShape(d)` | Sửa hình vùng nguy hiểm khi game vẽ khác vùng trúng (trả `null` = giữ nguyên) | ✅ elip nét đứt → hình tròn | ❌ |
| `evolveNeeds` | Map tên move → thẻ nội tại cần để tiến hoá | ❌ (core tự dùng `evo` trong `moves.js`, lấy từ wiki) | ✅ (đọc cấu hình game) |
| `cfg` | Ghi đè `CFG` (ví dụ `caseReach`) | `caseReach: 40` | `caseReach: 45`, … |
| `scene(cam)` | Cả cảnh (quái, nguy hiểm, vật phẩm, tường, địa hình) theo nhãn, toạ độ màn hình; `null` = đọc canvas | ✅ (từ `window.G`, chỉ trên `/dev.html`) | ❌ |
| `event` | Nút chạy event trong panel: `{ label, title, available(), start(), stop() }` (mục 4b) | ❌ | ✅ (Halloween Waves) |
| `objective(world, me, cam)` | Mục tiêu nhiệm vụ event `{ target: {x, y, src, hold}, hide: Set }`: `hide` = vật bỏ khỏi mọi danh sách (pokémon lạc / trong lồng, thanh máu) | ❌ | ✅ (mục 4b) |

---

## 2. Đã xong

### 2a. Trong core: chạy cho cả 2 bản (bảng dưới viết trước khi bản thường có `G`; phần lớn đã kiểm tra ở mục 3)

| Tính năng | Bản thường cần kiểm tra gì |
|---|---|
| Tự chọn skill/đồ trên điện thoại (bấm vào thẻ khi ô số bị ẩn) | Tìm thẻ từ `div.key` bị ẩn, nếu không có thì tìm hàng thẻ giống nhau quanh `#lvl-num`. **Chưa thử trên Android thật.** |
| Chọn skill theo Moveset theo tầng: tiến hoá > move build chưa có > nâng move tấn công build > **nội tại để tiến hoá** > nâng buff build > nội tại > skill ngoài build | Dựa vào tên pokémon game vẽ lên canvas (nút 🎯 trong popup Moveset lấy được tên thì ổn). |
| Ưu tiên nội tại để tiến hoá (Power, Reflexes, Sprint, Synthesis, Armor, Magnet, Vigor) | Bản thường lấy từ `evo` trong `moves.js` (wiki, 97/103 move). Cần xác nhận **tên thẻ trên game khớp** các tên này: console phải hiện lý do "điều kiện tiến hoá …". |
| Panel: Số ván, ▶ Chạy/■ Dừng, ⚔ Moveset, dòng "F8 bật/tắt bot · F9 hiển thị overlay" | F6 danh mục, F7 gắn nhãn vẫn còn. |
| Tìm đường A* vòng qua vật cản, nhớ điểm kẹt cả trận, bỏ qua mục tiêu không tới được 20s | Bản thường: `terrain` đọc từ mảng nền + nhãn `wall` theo kích thước (cây 30x40/26x40/28x40, đá 22x17, bí ngô 22x20). |
| Né đạn quái theo đường bay (`shot`), vùng skill (`hazard`), không nhặt đồ trong vùng nguy hiểm | Bản thường (27/10): cảnh báo vẽ **viền nét đứt** theo màu hệ quái (`js/systems/hazards.js`). Core ghi hình nét đứt thành vùng kín, key `dash:<nét>/<độ dày>`. `dash:4,4/2` (vùng tròn) và `dash:6,4/2` (tia, vẽ bằng `strokeRect`) = `hazard`. Vòng `rgba(255,60,80,0.35)` dưới đạn quái = `shot`. Trận thật: 7/7 vùng skill sinh dưới chân, bot ra trước khi nổ. Chưa gặp boss / tia để kiểm tra. |
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
12. [x] **Phát hành:** đã phát hành 1.5.0 → 1.5.13 (26–27/10). Lần sau (chỉ khi người dùng bảo):
    1. Tăng version ở **cả** `manifest.json` lẫn `VERSION` trong `core/bot.js`.
    2. Commit trên `main`.
    3. `git tag vX.Y.Z && git push origin main main:release --tags`.

    Người dùng chỉ nhận code từ nhánh `release`, nên push `main` lúc đang làm không ảnh hưởng gì. Chi tiết trong `CLAUDE.md`.

### 3b. Android: nhánh Firefox trong `psbot.user.js` (27/10, **chưa test trên máy thật**)

**Vì sao trước đây không chạy:** Kiwi/Chrome trên Android là Chromium. Userscript chạy trong **isolated world**, muốn chạm vào JS của trang thì Tampermonkey buộc phải chèn `<script>` — đúng thứ CSP `script-src 'self'` chặn. Kiwi không có `chrome.userScripts` nên không có đường nào khác.

**Cách chạy mới:** Firefox cho userscript lấy `window` thật của trang qua `unsafeWindow` / `wrappedJSObject`. `psbot.user.js` giờ có 3 nhánh:

1. **Firefox (Gecko)** — nhận ra bằng `navigator.userAgent` có `Gecko/` và không có `Chrome/`:
   - tải 5 file như cũ (`GM_xmlhttpRequest`, không qua CORS/CSP);
   - **ưu tiên chạy trong realm của chính trang:** `pageWindow.eval(code)`. Code sống y như `<script>` của trang, mọi object/array/`Intl` đều của trang → **không có lỗi realm nào**. Firefox kiểm tra CSP `eval` theo principal của *người gọi*, mà userscript là thành viên đặc quyền, nên `script-src 'self'` của trang không chặn (nếu bản Firefox nào đó chặn thì rơi xuống bước sau, không hỏng gì);
   - **dự phòng — sandbox:** `new Function('W', 'with (W) { …code… }')(pageWindow)` cho **từng file một** (giống các thẻ `<script>` rời), lỗi in kèm `tên file:dòng`. `with (W)` cho code mọi global của trang (`window`, `document`, `CanvasRenderingContext2D`, `XMLHttpRequest`, `KeyboardEvent`, `firebase`…) nên hook canvas + gửi phím vẫn chạy, nhưng object literal của sandbox đưa vào API trang sẽ bị Firefox từ chối (`Permission denied to access property …`); nhánh này cũng đặt `window.__psbotSandbox = true` để `bot.js` bỏ phần `Blob`/`Worker`;
   - không sửa CSP của trang, không khai thác lỗi của trang — chỉ dùng quyền sẵn có của userscript;
   - `PSBotSite` không lên sau khi chạy → hiện dòng "trình duyệt này chặn script chèn vào trang…".
2. **Chromium desktop** — giữ nguyên `GM_addElement` (API của extension, không qua CSP).
3. **Còn lại** — `loader.js` + `<script>` inline, chỉ dùng được khi trang không có CSP (doofcraft).

**Cài trên Android:** Firefox (CH Play) → Violentmonkey hoặc Tampermonkey → mở `https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js` → **Install** → cho phép `raw.githubusercontent.com` → mở game. Doofcraft chạy được ở cả Kiwi và Firefox.

**Đọc dòng trạng thái để biết đang chạy bản nào:** dòng góc trên trái luôn có `PSBot v1.5.13: …`. Không có số `v…` → **điện thoại vẫn đang chạy userscript cũ**, phải cập nhật (mở lại link trên → *Update/Reinstall*; nếu manager vẫn giữ bản cũ thì xoá script rồi cài lại). Lỗi 27/10 gặp đúng trường hợp này: bản 1.5.7 cũ đi vào nhánh dự phòng, chèn `<script>` bị CSP chặn, đợi 8 giây rồi báo "trang này chặn script…".

**Giới hạn:**
- **Kiwi / Chrome Android vẫn không chạy** (CSP). Muốn thì phải cài extension `.crx` có `world: "MAIN"` — chưa làm, và Android không có "Load unpacked".
- **Không dùng `Intl.*` với options object trong code bot.** Trong sandbox, `Intl` lấy từ `with (W)` là của trang, còn `{ … }` là object của sandbox → Firefox từ chối khi ICU đọc thuộc tính: `Permission denied to access property "localeMatcher"`. Đã gặp 27/10 với `new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', … })` ở `sites/default/site.js` → thay bằng `madridDate()` tự tính (đã đối chiếu `Intl` 26 280 mốc giờ 2025–2027, khớp 100%, kể cả 2 lần đổi giờ). Đừng thêm `toLocaleString(locale, options)`; gọi không tham số thì an toàn.
- **Lỗi realm thứ hai (27/10):** `Permission denied to access property Symbol.iterator` — khi API trang (WebIDL `sequence<…>`, spread…) lặp qua array/iterable của sandbox. Vì thế từ 1.5.13 nhánh Firefox **chạy `pageWindow.eval` trước** (realm của trang, hết lớp lỗi này); sandbox chỉ còn là dự phòng và báo kèm tên file.
- **Lỗi realm thứ ba (27/10, bản 1.5.13):** đúng chỗ `new Blob(['…'], { type })` của nhánh chạy nền trong `bot.js` — nó chạy **ngay khi nạp** vì `CFG.background` mặc định `true`, và Blob của trang lặp qua array của sandbox → cùng lỗi `Symbol.iterator`. Nay nhánh sandbox đặt `window.__psbotSandbox = true` và `bot.js` bỏ luôn việc tạo Worker trong trường hợp đó (trên pokesurvivor.com `blob:` cũng bị CSP chặn nên vẫn dùng `setInterval`).
- **Lỗi realm thứ tư (27/10, bản 1.5.13):** `gameCanvas()` trong `sites/default/site.js` — chưa có `#game` (điện thoại nạp chậm) nên nó chạy `[...document.querySelectorAll(…)]`; spread một NodeList của trang từ sandbox đọc `Symbol.iterator` → bị chặn. Lỗi ném trong `site.js` nhưng bị bắt khi đang chạy `bot.js` nên dòng báo ghi `(core/bot.js)` — đừng tin tên file một cách tuyệt đối, nó là file đang chạy lúc lỗi nổi lên.
- **Quy ước từ 1.5.13: không được `[...nodeList]`, `for (const x of nodeList)`, `Array.from(nodeList)` trong code bot.** Dùng `PSBotList(...)` (khai báo ở đầu mỗi `sites/<id>/site.js`, là `window.PSBotList`, copy theo chỉ số). Tương tự: đừng đưa array/object literal của sandbox vào API trang (`sequence<>`, `Intl` options…).
- Object literal của sandbox đưa vào API trang nói chung có cùng rủi ro. Chỗ còn lại: `new Blob([…], { type })` trong `bot.js` — nhánh Worker nằm trong `try/catch` nên hỏng thì rơi về `setInterval`; nút "Xuất data.js" (F6) có thể lỗi trên điện thoại, không ảnh hưởng auto-play.
- `Worker` tạo từ `blob:` vẫn bị CSP chặn → chế độ chạy nền rơi về `setInterval` (điện thoại đang mở tab thì không ảnh hưởng).
- Panel/log của bot là tiếng Việt; điện thoại không có F8/F9, dùng nút ▶ Chạy trên panel.

**Cần kiểm tra trên máy thật:**
1. Panel hiện ở góc trên trái, dòng trạng thái có `v1.5.13` và không còn chữ "chặn script".
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
- **Kẹt tường bản thường (27/10, sau 1.6.2).** Từ khi bỏ `/dev.html`, trang `/` đọc canvas mà không có địa hình lẫn nhãn cây: A* không thấy tường, bot chỉ học được tường sau khi đã kẹt. Đã thêm:
  - `terrain`: bảng màu chép tay từ `tiles.js`; lava, độc và điện tính là tường.
  - Nhãn cây/đá/bí ngô theo kích thước.
  - Bỏ 4 nhãn `canvas:256x256#… = wall` trong data.js (mỗi nhãn chặn cả mảng 512 đơn vị). Core bỏ qua nhãn `wall` trên mảng nền đọc được.
  - **Kẹt giả (cả 2 bản):** `posHist` ghi cả lúc bot cố ý đứng yên (đánh từ xa, giữ chỗ), nên bước đầu tiên sau khi đứng bị tính là kẹt → để lại điểm tường ở chỗ trống, giữ cả trận. Giờ chỉ đếm frame đang bấm phím.
  - **Chân vật thể lệch:** core đoán vùng chặn theo hình sprite, cao hơn chỗ va chạm thật 13–15 đơn vị (game: tâm ở đáy sprite − 2, bán kính tree 13 / rock 12 / pumpkin 11). Profile mới có trường `propFoot: { up, r }`; chỉ bản thường khai.
  - Test:
    - Vẽ chunk bằng `tiles.js` thật trong node: 25 biome, 0/25600 ô sai.
    - Trang giả lập vẫn đạt; giờ 0 điểm tường giả. Chạy trang giả lập ở tab nền thì chậm gấp 2–3 lần, phải đưa tab lên trước.
    - Game thật (Scorbunny, tài khoản test): trước khi sửa 4–7 lần kẹt trong 50 s đầu (phần lớn ở bãi trống), sau khi sửa 0 lần cả trận 1:38 và 1 lần trong 1:53.
- **Né skill boss, đứng mở vali, thoát kẹt góc (28/10, sau 1.6.4).** Đo trên `/dev.html` (chỉ để debug, xem CLAUDE.md mục kiểm tra 4), `SITE.scene = () => null` để đọc canvas như `/`, máu tối đa nâng lên 3000 cho trận kéo dài.
  - **Né skill boss:** nhận vùng / tia theo nét đứt (mục 2a). Boss gọi ra bằng `G.Game.debugTime(177)`. Tắt các nhãn `dash:` (= cách nhận diện cũ): trúng 22/80 vùng, 3/4 tia. Bật: trúng 5/76 vùng, 0/28 tia (3 boss).
  - **Đứng cho xong (cả 2 bản):** đã đứng trên vali (hoặc cách < 2× `caseReach`), hồ hồi máu, nhiệm vụ event thì bỏ qua vùng skill, quái và máu thấp, trừ khi máu < `holdHp` (25%). Rương khoá bản thường mở sau 3,5 s trong bán kính 46, game bắt đầu mở từ xa hơn `caseReach`, nên mốc 2× là cần. Test: `G.World.specialsNear` tìm rương, dịch nhân vật tới cạnh, mỗi 0,8 s thả một vùng skill lên rương. Không có phần này: 0/2 lần mở được (bot né đi). Có: 12/13.
  - **Thoát kẹt góc > né skill (cả 2 bản):** né qua lại trong góc thì tổng quãng đi > 12, nên phát hiện kẹt cũ không chạy. Mới: bấm phím `pinTime` (2 s) mà mọi vị trí trong vòng `pinMove` (30), có tường gần (điểm kẹt, nhãn `wall`, ô địa hình) → chạy ra theo hướng ngược các tường đó. Trong lúc thoát kẹt bỏ qua vùng skill. Trang giả lập `cornerZone` (một vùng skill phủ lên góc và nhân vật): bản cũ đứng yên trong vùng suốt 10 s, bản mới ra ngoài và lấy đồ sau 3,3 s (2/2).
- **Rift / boss bản thường (28/10, sau 1.6.5).** Người dùng xem bot vào rift rồi chết, không né skill boss.
  - **Vùng nguy hiểm giả:** bản thường để `autoTelegraph` (hình đỏ = cảnh báo). Tia lửa khi trúng đòn và hạt thời tiết của arena (game ép thời tiết theo chủ đề arena 135 s) cũng là ô đỏ/cam: bot thấy 100–190 vùng cùng lúc, không còn bước nào an toàn. Cảnh báo thật đã nhận qua nét đứt → profile tắt `autoTelegraph` (doofcraft giữ). Sau đó tối đa 8 vùng cùng lúc trên `/`.
  - **Vùng tròn vẽ khác vùng trúng:** `hazards.js` vẽ elip cao 0,75 nhưng `inside()` là hình tròn bán kính = rộng. Né theo chiều dọc thì bot dừng ở ~93 trong khi vùng trúng ~130 → `hazardShape` kéo thành hình tròn.
  - **Slam của boss:** boss dậm khi người chơi cách < 125 (vùng ~96 + bán kính boss, báo trước 0,85 s, 0,68 s khi nổi giận). Tốc độ Scorbunny ~110–125/s: từ sát boss không chạy ra kịp. Các đòn khác (nhảy đập r 82 / 1,15 s, lao, mưa vùng, tia) né được → giữ xa boss (`bossAura`). Còn trúng khi boss nhảy đập trúng người rồi dậm liền sau.
  - **Đo** (`/dev.html`, `G.Rift.debugArena('fighting')`, máu giữ cao, mỗi lần 35–40 s, huyền thoại ngẫu nhiên): như 1.6.5 trúng 24/61 skill (slam 18/20); chỉ giữ xa boss 14/39 (11/15); giữ xa + vùng tròn đúng 8/42 (5/6).
  - **Thoát kẹt góc nhầm:** doofcraft, bot lắc qua lại ở khoảng cách đánh cạnh tường → bị coi là kẹt góc. Giờ không tính khi đã ở đúng khoảng cách tới mục tiêu (`atGoal`).
  - **Game thật:** `/` 1:54 (không gặp rift/boss, tài khoản yếu, 0 lỗi). Doofcraft Waves (Feraligatr, nối ván 1:33): 2 lần mở vali (1 lần chịu 2 đòn vẫn mở xong), log chọn thẻ theo thứ tự build, chết ở 4:14 vòng 4 trong bầy 35–45 con.
- `sites/doofcraft/data.js` là bản sao data.js của bản thường. Có thể dọn các nhãn không dùng.
- **Sống lâu hơn (27/10, bản 1.5.17)**, đo trên Waves (Mewtwo) bằng bộ ghi 250 ms (máu, quái theo khoảng cách tới mép, mục tiêu):
  - Trận gốc chết 12:16 (vòng 11). Từ 3:26 tới lúc chết mất tổng 4,92 thanh máu: **49% lúc làm nhiệm vụ** (đứng ở lồng giữa phục kích, Escort dẫn qua bầy), 36% lúc đã máu thấp mà bị vây. 78% sát thương khi quái chồng lên người (mép < 0); 53% lúc đi đánh quái.
  - Đã sửa:
    - Nhiệm vụ chỉ làm khi máu > `questHp` 0,7 và dưới `questCrowd` 3 quái có mép trong `contact`. Trọng số 10 chỉ khi đang đứng giữ chỗ, lúc đi tới dùng 5.
    - Đánh quái giữ `engage` tính **từ mép** quái (trước tính từ tâm: quái to vòng sau có bán kính 45–60, nên bot đứng trong vùng né 80 của chính nó). Chỉ đi đánh khi máu ≥ `huntHp` 0,75 và dưới `huntCrowd` 8 quái trong 200.
    - Không đi mở vali khi máu thấp.
    - Bị quái chặn (mép trong 100 phía trước) không tính là kẹt: trước đây bật thoát kẹt hướng ngẫu nhiên, lực 40 đè cả lực né, đâm vào bầy.
    - Né cả bầy: hướng ngược trọng tâm quái trong 400 (trọng số 1/khoảng cách mép), `fleeWeight` 15 khi máu thấp, `fleeCrowdWeight` 8 khi ≥ `crowdFlee` 10 quái trong 250.
  - Kết quả từng trận (mỗi trận một phiên bản, dao động rất lớn): gốc 12:16; + chặn nhiệm vụ 13:40 (vòng 11, có Revive); + đánh từ mép / vali / né khi máu thấp 6:58 (vòng 9); + không thoát kẹt giữa bầy / giới hạn đánh 2:55 (vòng 4, bầy ma 8 → 30 con trong 5 s, Lv 15); + né cả bầy 10:46 (vòng 9). **Chưa đủ để kết luận.** Né cả bầy làm giết chậm hơn: 8:03 mới vòng 7 / Lv 23, trận trước cùng lúc đã vòng 9 / Lv 31.
  - Cách chết còn lại: bị vây kín 13–17 con trong 100 suốt > 10 s (không hướng nào trống), và vòng bầy ma lúc cấp còn thấp. Né cả bầy khi đông **mặc định tắt** ở 1.5.17 (`crowdFlee: Infinity`, bật thử: `PSBot.CFG.crowdFlee = 10`); né cả bầy khi máu thấp vẫn bật.
  - **Đo tiếp:** `farmMoney.js` giờ lưu phiên bản bot (`v`) cho mỗi trận và panel hiện "sống (N trận gần nhất, vX): TB · dài nhất" của bản đang chạy; `PSFarm.stats()` có cột `v`. Cần ~10 trận mỗi bản để so.

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
2. ~~Mục tiêu phụ~~: **đã làm (27/10, chưa phát hành)**, xem "Mục tiêu phụ (bot)" bên dưới.
3. Vòng bầy ma: né tốt hơn (quái nhanh, đông).

**Mục tiêu phụ (bot), `objective()` trong `sites/doofcraft/site.js`:**
- **27/10 (sau 1.6.0):** Escort: bot đi thẳng vào con lạc tới khi game báo "<tên> is following you! Take it to the green marker" (hoặc nó rời chỗ đứng ban đầu > 24), rồi mới về đích. Trước đó phân biệt chờ / đi theo bằng khoảng cách 70, trong khi chạm là ~45: bot lượn quanh nó mãi (người dùng báo). Đã thấy trên game: chạm được, sprite con lạc không bị tính là quái. Escort ở xa (50–60 m) vẫn hay thất bại vì hết vòng trước khi về tới (vòng hết = mọi nhiệm vụ thất bại).
- **Hàng rào Halloween** = cột `canvas:6x20` (bySize wall) + thanh ngang `canvas:16x14#12u4dbo` (cùng cỡ với rương nên gắn theo hash, một bảng màu cho mọi biome). Thanh ngang trước đây không có nhãn: bot đi vào giữa các cột và kẹt. Sau khi gắn: 2 phút chơi, 0 lần kẹt.
- **Tài khoản test:** đừng chạy bot khi người dùng đang chơi cùng tài khoản: trận mới làm server đóng trận kia (`POST /api/runs/checkpoint` → 409 `run_already_finished`, trận "Run over" ở đúng mốc checkpoint 1:00).
- Người dùng báo: nhận nhiệm vụ xong bot đứng quay quay ở vòng con pokémon lạc, và xoay trước cửa nhà nguyện. Nguyên nhân: thanh máu con lạc và vòng đích (`drawLostGoal`) đều màu `#5fe08a` = quả hồi máu (`good`); con lạc còn bị tính là quái. Giờ `hide` bỏ các thứ đó (cả pokémon trong lồng: sprite `Idle` ở giữa lồng, thấp hơn tâm ~15).
- Nhiệm vụ đang mở = tiêu đề có trong HUD (không có ✓/✗). Trên màn hình: cửa = `fill:gradient:rgba(255,170,60,0.9)` rộng > 70 (cửa ở dưới 30), đèn tắt = `fill:gradient:rgba(160,190,255,0.7)` (đứng ở chân sprite 8x23 gần nhất), lồng = 24x28 có pokémon bên trong, con lạc = elip `fill:#7dffb0` (xa > 70 thì nó đang chờ), đích = elip `#5fe08a` rộng > 80. Core giờ gắn key gradient theo màu stop đầu (`addColorStop`).
- Ngoài màn hình: mũi tên tam giác `fill:#ffb347` (nhiệm vụ) / `#7dffb0` (con lạc / đích, nhãn "Marker · N m"), gốc = `e,f` của item, đỉnh = `pts[0]`; điểm đích trên tia đó cách người chơi N×32.
- Core: sau rift / prize / hồ máu, không làm khi máu thấp, `CFG.questWeight` 10, không bỏ vì quái đông; không có đường thì bỏ 3s như rift (trước là 20s: đích cách ~1800, ngoài lưới A*, bị bỏ liên tục → Escort thất bại).
- Kết quả (Mewtwo): trước khi sửa 0 nhiệm vụ. Sau: trận 1 từ vòng 7: Escort ✓, Lanterns ✓, Cage ✗ (bị bầy quái đẩy ra, khi đó trọng số còn 5); trận 2 vòng 2–5 (trọng số 10): Trick-or-treat ✓, Escort ✓ ×3, Cage ✓. Trận 1 chết vòng 9 (~9:40).

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
