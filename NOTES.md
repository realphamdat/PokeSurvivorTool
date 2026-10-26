# Ghi chú: doofcraft đã làm, bản thường còn phải làm

Cập nhật: 2026-10-26 (bot v1.4.0). Bản thường (pokesurvivor.com) chưa test được vì mạng nơi làm việc chặn trang, chỉ vào được doofcraft. Mọi thứ ghi "đã test" là test trên **doofcraft thật** (tài khoản test) hoặc trên trang giả lập trong trình duyệt.

---

## 0. Bắt đầu buổi tối (bản thường)

1. `git pull` để lấy bản mới nhất (`main`, từ commit `2db121f` trở đi).
2. **Tài khoản test:** `account_test.js` nằm trong `.gitignore` nên **không có trên GitHub**. Ở nhà phải tự tạo lại (cùng định dạng `module.exports = { normal: {…}, doofcraft: {…} }`) và tuyệt đối không commit file này.
3. Nạp bot: `chrome://extensions` → Load unpacked thư mục repo, hoặc nạp trong console theo thứ tự ở mục 6.
4. Nếu làm cùng Claude: bảo Claude **đọc file này trước**, rồi đi lần lượt theo mục 3.

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
| `cfg` | Ghi đè `CFG` (ví dụ `caseReach`) | `{}` | `caseReach: 45`, … |

---

## 2. Đã xong

### 2a. Trong core: chạy cho cả 2 bản, nhưng mới test thật trên doofcraft

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

### 2b. Chỉ có ở doofcraft (`sites/doofcraft/site.js`): bản thường CHƯA có

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

1. [ ] **Chạy thử bot như hiện tại** 1 trận. Bật F9, xem console. Ghi lại: bot có chạy không, có chọn skill không, có lỗi đỏ không.
2. [ ] **Thu dữ liệu:** trong trận, dán script ở mục 7 vào console (gần tường/cây/rương, và một lần lúc boss ra chiêu). Giữ các file `psbot-probe-default-*.json`.
3. [ ] **Máu trên HUD:** xem `PSBot.state.hpRatio` khi đang chơi. Nếu `undefined` thì chữ máu không vẽ trên canvas → cần cách đọc máu khác (DOM?) để bật chế độ thủ.
4. [ ] **Tự nhận diện:** `PSBot.state.selfDex` phải là số pokémon đang chơi.
5. [ ] **Vùng skill và đạn quái:** tìm màu/hình mà bản thường dùng (mục 2c), thêm vào `tags` của `sites/default/site.js` (`hazard` / `shot`). Hình đã có nhãn không bị bộ lọc "hạt bụi nhỏ" (< 150 px²) loại bỏ.
6. [ ] **Địa hình:** xem bản thường vẽ nền thế nào (có mảng 256×256 không?). ⚠️ `sites/default/data.js` đang có nhãn `canvas:256x256#…` = `wall`. Nếu đó là mảng nền thì đang **chặn cả vùng lớn** trong A* → bỏ các nhãn đó và viết `terrain()` riêng.
7. [ ] **Vật thể (cây, đá, rương, bẫy):** tìm kích thước sprite. Vì bản thường có `sizeTags: true`, có 2 cách: gắn key `canvas:WxH` thẳng vào `tags`/data.js, hoặc sửa `tagOf()` trong `core/bot.js` để đọc cả `bySize`. Kiểm tra lại 2 nhãn có sẵn `canvas:14x14` / `canvas:12x12` = `hazard` có đúng không.
8. [ ] **Vali** (`case`) của bản thường là loại đứng lên trên, giữ `caseReach: 25`, **đừng chép 45 của doofcraft**.
9. [ ] **Tiến hoá:** xác nhận trong console có lý do "điều kiện tiến hoá …" khi chọn Power/Magnet… Nếu game cập nhật move: `node crawl-moves.js --evo`.
10. [ ] **Điện thoại:** nhờ người có Android thử tự chọn skill. Nếu không chạy thì xem giao diện điện thoại có `#lvl-num` không.
11. [ ] **Đo kết quả:** đếm log "không có đường tới mục tiêu" (mong đợi vài lần mỗi phút, không ra cả loạt), ghi thời gian sống mỗi trận.
12. [ ] **Phát hành:** tăng version ở **cả** `manifest.json` lẫn `VERSION` trong `core/bot.js` (đang `1.4.0`) để người cài ZIP nhận thông báo.

---

## 4. Vấn đề còn mở (doofcraft)

- **Thời gian sống** (Mewtwo của tài khoản test):
  - Trước khi sửa: 3:55–4:13 (3 trận). Nguyên nhân: lao vào bầy quái để nhặt kinh nghiệm, và tính nhầm chính mình là quái.
  - Sau khi sửa: 7:34, 7:08. Có thêm tiến hoá và cây theo biome: 5:27, **10:18** (hạ boss Thundurus, Lunala).
  - Kết quả dao động nhiều theo biome và theo thẻ game đưa ra.
- **Đợt quái ập đến** (từ 25 lên 85 con trong 3 giây) vẫn là nguyên nhân chết chính.
- **Đã thử và gỡ: chế độ "thoát vây".** Từ 12 quái trong vòng 220 đơn vị thì chạy về hướng thưa nhất. 1 trận chết ở 5:35, sớm hơn bản không có nó. Nếu thử lại: chỉ bật khi máu thấp, hoặc ưu tiên hạ quái nhanh thay vì chạy.
- `sites/doofcraft/data.js` là bản sao data.js của bản thường. Có thể dọn các nhãn không dùng.

---

## 5. Thử nghiệm đã dùng (không có trong repo)

Các "trang giả lập" (bảng lên cấp, game mini có tường/vùng skill, đọc đường đi A*) chỉ là script tạm trong máy làm việc, không commit. Ở nhà cần test thì nhờ Claude dựng lại, hoặc test thẳng trên game thật.

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
