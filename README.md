# PokeSurvivor Bot

**Tiếng Việt** · [English](README.en.md)

Bot tự chơi [pokesurvivor.com](https://pokesurvivor.com/) và [pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/) (tự nhận bản game theo trang). Miễn phí · tác giả [damhieu2808](https://github.com/damhieu2808)

## Cài trên máy tính (Chrome)

1. [**Tải bot (ZIP)**](https://github.com/damhieu2808/PokeSurvivorTool/archive/refs/heads/release.zip). Link này luôn tải bản mới nhất.
2. Giải nén, mở `chrome://extensions`, bật **Developer mode**.
3. Bấm **Load unpacked**, chọn thư mục vừa giải nén.

## Cài trên điện thoại (Android)

> ℹ️ Toàn bộ bot nằm sẵn trong file userscript. Trình quản lý userscript tự chạy code đó trong trang, nên việc pokesurvivor.com chặn script chèn vào trang (CSP) không còn ảnh hưởng. Khuyên dùng **Firefox**. Edge / Kiwi + Tampermonkey trên Android từng không chạy được với bản cũ; với cách mới thì chưa thử lại.

1. Cài **Firefox** (CH Play).
2. Trong Firefox, cài tiện ích **Violentmonkey** hoặc **Tampermonkey** (menu ⋮ → Tiện ích / Add-ons).
3. Bấm nút copy ở góc khối dưới đây, dán vào **thanh địa chỉ** của trình duyệt đó rồi mở:

```
https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js
```

4. Trình quản lý tự mở trang cài script → bấm **Install** (Cài đặt). Đã cài bản cũ thì cài đè lên.
5. Vào game: panel **PokeSurvivor Bot** hiện ở góc trên bên trái.

Trình quản lý tự kiểm tra bản mới định kỳ. Muốn cập nhật ngay: mở trình quản lý → **Check for updates** (Kiểm tra cập nhật), hoặc mở lại link ở bước 3.

## Cài trên iPhone / iPad

1. Cài app **Userscripts** (App Store, miễn phí).
2. Mở **Cài đặt → Safari → Tiện ích → Userscripts**: bật lên và cho phép trên mọi trang web.
3. Trong **Safari**, dán link ở bước 3 phần Android vào thanh địa chỉ rồi mở.
4. Bấm biểu tượng tiện ích (hình mảnh ghép hoặc **aA**) trên thanh địa chỉ → **Userscripts** → **Cài đặt** (Install).
5. Vào game trong Safari: panel hiện ở góc trên bên trái. iOS chưa thử; pokesurvivor.com có thể bị chặn như trên Android. Nếu lỗi, báo qua liên hệ bên dưới.

## Dùng

Nhập **Số ván** (0 = chơi mãi) rồi bấm **▶ Chạy**, bấm lại để **■ Dừng**. **⚔ Moveset** để chọn 4 move bot ưu tiên cho từng pokémon. Danh sách move lấy theo đúng từng bản game, có thêm các move TM pokémon đó học được (pokesurvivor.com: Kecleon Shop; doofcraft: Poké Mart): "TM ✓" là đã dạy, "TM" là chưa dạy (game chỉ đưa thẻ TM đã dạy). Phím tắt trên máy tính: **F8** bật/tắt bot, **F9** hiện lớp vẽ (bot đang thấy gì).

**Màn hình nhỏ** (điện thoại, nhất là khi xoay ngang): panel gọn hơn, lần đầu thu gọn sẵn thành một dòng tiêu đề có nút **▶ / ■** để chạy / dừng; bấm **+** để mở ra. Popup Moveset nằm cạnh panel thay vì bên dưới.

**Không gửi bảng xếp hạng** (pokesurvivor.com, bật sẵn): ván do bot chơi không được gửi lên bảng xếp hạng. Ván bạn tự chơi (bot tắt) vẫn được gửi. Muốn ván của bot lên bảng thì bỏ tick ô này trên panel.

**Auto skill** (bật sẵn): bot liên tục đổi skill (phím E) để dùng hết các move. Bỏ tick thì bot không đổi skill nữa, bạn tự đổi bằng tay.

**Lưu game sau mỗi ván:** trên pokesurvivor.com, hết ván bot về menu, bấm **Guardar** và đợi game báo đã lưu lên cloud rồi mới chơi ván tiếp (đợi tối đa 1 phút). Doofcraft tự lưu lên server khi hết ván nên bot không cần bấm gì.

**🎃 Event Halloween:** nút này bấm được khi game đang có event, còn lại thì bị khoá.
- **[pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/):** chạy chế độ Waves của event.
- **[pokesurvivor.com](https://pokesurvivor.com/):** từ 30/10 đến 1/11 mọi trận đều là trận Halloween, nút chạy như ▶ Chạy.

**⚡ Hyper** (pokesurvivor.doofcraft.com): chạy chế độ HYPER của game (mọi thứ mạnh lên nhanh gấp đôi, Eternatus ở 30:00, ×1,5 xu, bảng xếp hạng riêng; nên dùng pokémon đã nâng max). Bot dừng thì chế độ chơi trong game trở về như cũ (cả với nút event). Nếu đang có ván lưu dở của chế độ khác, bot không chơi tiếp ván đó mà dừng và báo trên panel: chơi tiếp hoặc bấm **End run** trong game trước, rồi bấm lại nút.

> ⚠️ **Bot 1.5.0–1.5.6 chuyển pokesurvivor.com sang `/dev.html`.** Từ 26/10, trang này của game không còn dùng tài khoản (không lưu lên cloud, không lên bảng xếp hạng). Từ bản 1.5.7, bot đưa bạn về trang chính. Nếu thấy địa chỉ là `pokesurvivor.com/dev.html`, hãy cập nhật bot rồi mở lại `pokesurvivor.com`.

### Bot chọn thẻ lên cấp thế nào

Mỗi lần lên cấp, bot chấm điểm từng thẻ rồi chọn thẻ điểm cao nhất. Lý do mỗi lần chọn hiện trong console (F12), ví dụ `chọn 2 Psychic — lấy move build #2`.

Thứ tự giống [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT), áp dụng cho cả 2 bản. **Build** là Moveset của pokémon đang chơi: bot nhận ra pokémon qua tên trên HUD, hoặc pokémon partner trong save nếu đang ở menu. Popup tự đổi theo pokémon đang chơi: khi đã nhận ra pokémon, popup chỉ hiện tên trên tiêu đề và 4 move. Bấm ✎ để sửa build của pokémon khác (gõ tên); bấm 🎯 để quay lại theo pokémon đang chơi. Có sẵn build của tool đó cho 3 pokémon (đều nên cầm Shell Bell):
- **Mewtwo:** Confusion → Harden → Nasty Plot → Psychic.
- **Kyogre:** Bubble → Nasty Plot → Aqua Ring → Hydro Pump.
- **Bulbasaur:** Energy Ball → Nasty Plot → Leaf Storm → Giga Drain (mua "Starting move" Energy Ball trong shop).

Pokémon khác chưa có Moveset thì dùng **build mặc định 3 move**: move khởi đầu (★) → buff tấn công đúng phía (Nasty Plot nếu Sp.Atk cao hơn, Swords Dance / Dragon Dance nếu Atk cao hơn) → Harden. Ô thứ 4 để bạn tự chỉnh; nếu bạn chưa lưu build thì bot tự lấp ô đó trong trận (move sát thương hợp chỉ số, đạn tự ngắm trước). Popup Moveset hiện build mặc định này; sửa rồi bấm **Lưu** thì bot theo build của bạn.

Danh sách move trong popup: pokesurvivor.com lấy **từ game** (đúng move khởi đầu đã mua, TM đã dạy / chưa dạy, tên theo ngôn ngữ game) khi bot đọc được game; doofcraft dùng danh sách từ wiki. Phía tấn công lấy từ chỉ số trong game; không đọc được thì theo move khởi đầu.

Tầng trên luôn thắng tầng dưới:

1. Thẻ **tiến hoá** một skill.
2. Nội tại **lấy là tiến hoá ngay** một move đã max (thẻ vàng; pokesurvivor.com).
3. **Sitrus Berry / Baya Zidra** (hồi 45% máu) khi **máu dưới 35%**. Máu khoẻ thì gần cuối (sau mục 7).
4. **Lấy move trong build** chưa có (#1 trước #2…). Không có build: move mới khi còn ô, theo thứ tự tự chọn ở trên.
5. **Nội tại mà move đang có cần để tiến hoá** (ví dụ Magnet cho Psychic), khi chưa lấy nội tại đó. Đứng trên mọi nâng cấp move.
6. **Nâng cấp move còn tiến hoá được**: càng gần max càng gấp; move trong build được cộng thêm chút.
7. **Nội tại**: **giáp** (Armor / Coraza) trước tiên cho tới khi đầy (pokesurvivor.com: -6% sát thương mỗi thẻ, tới 70%; doofcraft: 20 thẻ, khoảng 67%). Sau đó: Power > Reflexes > (Focus / Sniper, doofcraft) > Vigor > Synthesis > Learning > Magnet > Sprint.
8. **Nâng cấp move không tiến hoá được** (move build trước, theo thứ tự build).
9. **Move mới ngoài build** khi còn ô thừa (ô của các move build chưa có luôn được giữ lại).
10. Skill mới khi đã hết ô: chỉ lấy khi không còn gì khác.

**Z-move** (pokesurvivor.doofcraft.com, thẻ "Firium Z", "Psychium Z"… có nhãn Z-Move, từ phút 15, vòng 10 ở Waves, phút 7:30 ở Hyper): xếp giữa mục 5 và 6. Đã có Z-move thì bot bấm **F** khi có từ 8 quái trong tầm nổ (400), hoặc từ 3 quái khi máu thấp; nổ xong phải chờ 120 giây.

Nếu không có thẻ nào thuộc mục 1–7 và còn lượt **Reroll** thì bot đổi thẻ (máy tính; pokesurvivor.com thì cả điện thoại).

Số ô move: bản thường đọc từ game (thường 4, nâng cấp được), pokesurvivor.doofcraft.com tính là 4. Các move đã **bond** chỉ chiếm chung 1 ô, nên sau khi bond bot lại lấy thêm move mới. Game chỉ đưa thẻ move mới khi còn ô trống, nên thấy thẻ đó là bot biết còn chỗ.

**Đồ cầm** (cả 2 bản), xếp cho sống lâu: Shell Bell > Leftovers > Quick Claw > Focus Sash > Assault Vest > Rocky Helmet > Lucky Egg > Amulet Coin > Choice Scarf > Life Orb > Choice Band (luôn bỏ).

### Cách bot chơi trên pokesurvivor.com

Bot đọc trạng thái thật của game thay vì nhìn màn hình. Cách lái dựa trên [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT):
- **Né:** chấm 16 hướng, dự đoán quái đuổi tới đâu và vùng skill nổ lúc nào (lúc nó nổ mình đứng ở đâu). Máu càng thấp càng sợ quái thường; boss, đạn, vùng skill thì luôn né.
- **Mục tiêu:** Gholdengo > rift > cứu pokémon lạc / Meowth > buff, hồ hồi máu (máu < 60%), rương lớn > nhặt đồ. Đường đi tính bằng A* trên địa hình thật; không tới kịp trước khi mục tiêu biến mất thì bỏ.
- Đứng chỗ bắn không bị tường / cây chặn. Quái đông thì chạy vòng tròn lớn, kéo quái theo sau.
- **Rift** và **Arceus** (phút 30): chạy vòng trong sân, giữ boss ở phía đối diện.
- **Orb:** orb khống chế khi máu dưới 40% hoặc bị 8 quái vây, orb buff khi có boss (trước đây bot bấm 5–8 liên tục nên dùng hết ngay).
- Game tự pause khi mất focus thì bot tự chơi tiếp (trừ khi bạn tự bấm Esc / P).
- **Gợi ý pokémon** (ở menu / màn kết thúc trận): 3 pokémon bạn đang có mạnh nhất khi treo máy, và pokémon đang dùng có nên đổi không. Điểm tính theo công thức sát thương của game: move tự ngắm tốt nhất × chỉ số tấn công hợp move × cùng hệ (×1,2) × thời tiết tự tạo (Kyogre có mưa: ×1,5 hệ Nước) × độ trâu × tốc độ × nâng cấp đã mua. Bot không tự đổi, bạn tự chọn.

Không có trạng thái game (bookmarklet, doofcraft) thì bot dùng cách cũ: đọc màn hình.

## Cập nhật

- **Máy tính:** khi panel hiện dòng vàng "⬆ Có bản mới", tải lại ZIP ở bước 1 rồi giải nén đè lên thư mục cũ.
- **Điện thoại:** trình quản lý userscript tự cập nhật định kỳ (hoặc bấm **Check for updates**).

Cần cài hộ: liên hệ [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
