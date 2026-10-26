# Ghi chú: doofcraft đã làm, bản thường còn phải làm

Cập nhật: 2026-10-26. Bản thường (pokesurvivor.com) chưa test được vì mạng nơi làm việc chặn trang. Mọi thứ bên dưới đã test trên **doofcraft thật** (tài khoản test) và trên game mô phỏng trong trình duyệt.

## Cấu trúc (nhắc lại)

- `core/`: lõi dùng chung cho cả 2 bản (`bot.js`, `moves.js`, `farmMoney.js`).
- `sites/default/`: bản thường (`site.js` + `data.js`).
- `sites/doofcraft/`: doofcraft (`site.js` + `data.js`).
- `manifest.json` và `loader.js` chọn folder theo domain.
- `account_test.js`: tài khoản test, đã có trong `.gitignore`, **không commit**.

## Đã xong

### Trong core: áp dụng cho cả 2 bản, nhưng mới test thật trên doofcraft

| Tính năng | Ghi chú cho bản thường |
|---|---|
| Tự chọn skill/đồ trên điện thoại (bấm vào thẻ khi ô số bị ẩn) | Bản thường tìm thẻ từ `div.key` bị ẩn, nếu không có thì tìm hàng thẻ giống nhau quanh `#lvl-num`. **Chưa thử trên Android thật.** |
| Chọn skill theo Moveset theo tầng (tiến hoá > move build chưa có > nâng move tấn công > nâng buff > nội tại > skill ngoài build) | Dựa vào tên pokémon game vẽ lên canvas (nút 🎯 lấy được thì là ổn). |
| Panel gọn: Số ván, ▶ Chạy/■ Dừng, ⚔ Moveset (F6 danh mục, F9 overlay vẫn còn) | |
| Tìm đường A* vòng qua tường, nhớ điểm kẹt cả trận, bỏ qua mục tiêu không tới được 20s | Bản thường chỉ biết tường qua nhãn `wall` (data.js/F6) và điểm đã kẹt. |
| Né đạn quái theo đường bay (nhãn `shot`), vùng skill (nhãn `hazard`), không nhặt đồ trong vùng nguy hiểm | Bản thường **chưa có nhãn** `shot`/`hazard` đúng màu của game, chỉ có đoán "hình đỏ = nguy hiểm". |
| Nhãn mới `break` (Phá được, phím 8 ở F7): đứng cạnh để skill phá | Bản thường chưa gắn cho vật nào. |
| Đếm ván đúng khi bấm Chạy giữa trận / ở màn hình kết quả | |
| Không nhặt đồ có quái đứng sát; máu < 50% thì chế độ thủ (không nhặt kinh nghiệm/phá đá, né quái mạnh gấp đôi) | Đọc máu từ chữ "123 / 208" trên HUD. Bản thường phải kiểm tra HUD có vẽ chữ này lên canvas không, nếu không thì chế độ thủ không bao giờ bật. |
| Nhận diện chính mình theo mã pokémon (số dex trong đường dẫn sprite), chọn mã được nhận nhiều nhất trong trận | Trước đây sprite ra đòn (Shoot/Attack) của chính mình bị tính là quái. Bản thường cũng có số dex trong đường dẫn (`/assets/pokemon/<dex>/…`). |

### Riêng doofcraft (`sites/doofcraft/site.js`)

- **Địa hình:** đọc 22 bảng màu biome từ mã nguồn game, phân loại từng ô của mảng nền 256×256 thành tường (chặn) / chất lỏng (tốn điểm) / nền (`terrain`).
- **Nhãn theo màu của game:** `fill:#ff2445` là vùng skill quái/boss (`hazard`), `fill:rgba(255,60,80,0.35)` là đạn quái (`shot`).
- **Nhãn theo kích thước sprite (`bySize`, lấy từ các hàm vẽ sprite của game):** `22x17` đá (`break`), `14x14` bẫy (`hazard`), cây theo biome là tường (`30x40` rừng, `26x40` pha lê, `28x40` cây chết), Halloween: `8x23` đèn lồng, `24x28` lồng, `6x20` cọc rào là tường, `14x11` bí ngô là `break`. Hàng rào `16x14` trùng kích thước rương nên không gắn.
- **Tiến hoá (`evolveNeeds`):** đọc từ cấu hình game xem move nào cần nội tại nào để tiến hoá (86 move: Power = attack, Reflexes = cooldown, Sprint = speed, Synthesis = regen, Armor = defense, Magnet). Core xếp nội tại mà một move trong build đang có cần ở tầng 250 (trên nâng buff, dưới nâng move tấn công). Trận thật: lấy Magnet cho Psychic, Power cho Hyper Beam, và cả hai đã tiến hoá (`Hyper Beam+`, `Psychic+`).
- **Rương cứng:** `caseReach: 45`.
- **Điện thoại:** bấm thẳng `button.ps-card` khi màn hình cảm ứng.

## Việc cần làm cho bản thường (checklist)

1. [ ] **Thu dữ liệu:** vào trận, bật bot, mở console (F12), dán **script thu dữ liệu** (cuối file này). Chạy ở gần tường/cây/rương, và chạy thêm một lần lúc boss ra chiêu. Gửi các file `psbot-probe-default-*.json` tải về.
2. [ ] **Địa hình:** xem bản thường vẽ nền thế nào (có mảng 256×256 như doofcraft không?). `sites/default/data.js` đang có vài nhãn `canvas:256x256#…` = `wall`. Nếu đó là mảng nền thì gắn cả mảng là tường là **sai** (sẽ chặn cả vùng lớn), cần bỏ và viết `terrain()` riêng cho bản thường.
3. [ ] **Vùng skill và đạn quái:** tìm màu thật mà bản thường dùng cho vùng cảnh báo và đạn quái, rồi thêm vào `tags` của `sites/default/site.js` (`hazard` / `shot`). Hình đã có nhãn sẽ không bị bộ lọc "hạt bụi nhỏ" loại bỏ.
4. [ ] **Vật thể:** tìm sprite đá/vật phá được, bẫy, rương. Lưu ý: bản thường có `sizeTags: true` nên `tagOf()` **không đọc** `SITE.bySize`. Muốn dùng `bySize` thì phải sửa `tagOf()` trong `core/bot.js`, hoặc gắn nhãn thẳng vào `tags`/`data.js`.
5. [ ] **Vali** (`case`) của bản thường là loại đứng lên trên, nên giữ `caseReach: 25`, đừng chép số 45 của doofcraft.
6. [ ] **Điện thoại:** nhờ người có Android thử tự chọn skill. Nếu không chạy thì xem giao diện điện thoại có `#lvl-num` không.
7. [ ] **Kiểm tra trên trận thật:** bật F9 xem overlay (vòng xanh tím = tường, đoạn cam = đạn, chấm trắng = đường A*), đếm log "không có đường tới mục tiêu" (mong đợi: vài lần mỗi phút, không ra cả loạt).
8. [ ] **Version:** đang là `1.3.1`. Phát hành cho người cài ZIP thì tăng ở cả `manifest.json` lẫn `VERSION` trong `core/bot.js`.

## Vấn đề còn mở (doofcraft)

- **Sống sót:** trước đây chết quanh 3:55–4:13 (3 trận liên tiếp). Nguyên nhân là bot lao vào giữa bầy 80–90 quái để nhặt kinh nghiệm, cộng thêm việc tính nhầm chính mình là quái. Sau khi sửa: sống tới **7:34** và **7:08** (2 trận). Cả hai lần chết đều do một đợt quái ập đến quanh mốc 7:00 (từ 25 lên 85 con trong 3 giây, hết máu trong khoảng 4 giây). Bot chưa có cách thoát vòng vây hình thành nhanh như vậy.
- **Đã thử và gỡ: chế độ "thoát vây".** Từ 12 quái trở lên trong vòng 220 đơn vị thì chạy về hướng thưa nhất (chấm 16 hướng theo mật độ quái, bỏ hướng có tường), bỏ qua nhặt đồ. Kết quả 1 trận: chết ở **5:35** (Gloomy Graveyard), sớm hơn 2 trận không có chế độ này. Lúc chạy, quái trong vòng 220 vẫn tăng từ 20 lên 55, và việc chạy làm hạ quái chậm hơn. Chưa đủ dữ liệu để kết luận (mỗi trận một biome khác nhau), nên chưa đưa vào. Nếu thử lại: chỉ bật khi máu thấp, hoặc cân nhắc tốc độ hạ quái thay vì chỉ chạy.
- Sau khi thêm tiến hoá và cây theo biome: 2 trận sống tới 5:27 và **10:18** (hạ boss Thundurus và Lunala). Kết quả dao động nhiều theo biome và theo thẻ game đưa ra (trận 10:18 không hề được đưa thẻ Hyper Beam).
- Bản thường cũng có thể đọc `evolveNeeds` nếu tìm được cấu hình tương tự. Nếu không thì cần thêm điều kiện tiến hoá vào `moves.js` (sửa `crawl-moves.js`).
- `sites/doofcraft/data.js` là bản sao data.js của bản thường. Có thể dọn các nhãn không dùng cho doofcraft.

## Cách test nhanh trong console (khi không dùng extension)

Nạp theo thứ tự: `sites/<bản>/site.js` → `sites/<bản>/data.js` → `core/moves.js` → `core/bot.js` → `core/farmMoney.js`. Sau đó dùng `PSBot.state.debug = true` (overlay) và `PSBot.play(1)`.

## Script thu dữ liệu (chạy trong console, khi đang trong trận và bot đang bật)

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
