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

Nhập **Số ván** (0 = chơi mãi) rồi bấm **▶ Chạy**, bấm lại để **■ Dừng**. **⚔ Moveset** để chọn 4 move bot ưu tiên cho từng pokémon. Trên pokesurvivor.com, danh sách có thêm các move TM pokémon đó học được (Kecleon Shop): "TM ✓" là đã dạy, "TM" là chưa dạy (game chỉ đưa thẻ TM đã dạy). Phím tắt trên máy tính: **F8** bật/tắt bot, **F9** hiện lớp vẽ (bot đang thấy gì).

**Không gửi bảng xếp hạng** (pokesurvivor.com, bật sẵn): ván do bot chơi không được gửi lên bảng xếp hạng. Ván bạn tự chơi (bot tắt) vẫn được gửi. Muốn ván của bot lên bảng thì bỏ tick ô này trên panel.

**🎃 Event Halloween:** nút này bấm được khi game đang có event, còn lại thì bị khoá.
- **[pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/):** chạy chế độ Waves của event.
- **[pokesurvivor.com](https://pokesurvivor.com/):** từ 30/10 đến 1/11 mọi trận đều là trận Halloween, nút chạy như ▶ Chạy.

> ⚠️ **Bot 1.5.0–1.5.6 chuyển pokesurvivor.com sang `/dev.html`.** Từ 26/10, trang này của game không còn dùng tài khoản (không lưu lên cloud, không lên bảng xếp hạng). Từ bản 1.5.7, bot đưa bạn về trang chính. Nếu thấy địa chỉ là `pokesurvivor.com/dev.html`, hãy cập nhật bot rồi mở lại `pokesurvivor.com`.

### Bot chọn thẻ lên cấp thế nào

Mỗi lần lên cấp, bot chấm điểm từng thẻ rồi chọn thẻ điểm cao nhất. Lý do mỗi lần chọn hiện trong console (F12), ví dụ `chọn 2 Psychic — lấy move build #2`.

**Có Moveset cho pokémon đang chơi** (bot nhận ra pokémon qua tên trên HUD; nút 🎯 trong popup lấy tên đó, hoặc pokémon partner trong save nếu đang ở menu). Pokémon nào chưa tự đặt Moveset thì dùng build mặc định: build tốt nhất mà [SurvivorTiers](https://survivortiers.pages.dev/en/) tìm ra qua các trận mô phỏng (làm mới bằng `node crawl-moves.js --builds`). Thứ tự ưu tiên, tầng trên luôn thắng tầng dưới:

1. Thẻ **tiến hoá** một skill.
2. **Lấy move trong build** chưa có (#1 trước #2…).
3. **Nâng cấp move trong build theo đúng thứ tự Moveset**: move #1 được nâng tới max trước, rồi tới #2… (move tấn công hay buff như nhau). Muốn move nào max trước thì đặt nó lên đầu.
4. **Lấy move mới ngoài build khi còn ô trống**: bot dùng xoay vòng mọi move, nên càng đủ ô (thường 4) càng nhiều đòn. Ô của các move build chưa có luôn được giữ lại; ví dụ build 2 move thì bot lấy thêm 2 move bất kỳ, build đủ 4 move thì không lấy move ngoài.
5. **Learning** (nội tại tăng kinh nghiệm nhận được).
6. **Nội tại mà move trong build cần để tiến hoá** (ví dụ Magnet cho Psychic), khi đã có move đó và chưa có nội tại.
7. Nội tại khác: tấn công (sát thương, hồi chiêu, tầm…) > phòng thủ (máu, hồi máu, giáp, tốc độ, hút…) > còn lại.
8. Nâng cấp skill ngoài build (cấp cao trước).
9. Skill mới ngoài build khi đã hết ô: chỉ lấy khi không còn gì khác. Nếu cả 3 thẻ đều thuộc loại này và còn lượt **Reroll** thì bot đổi thẻ (máy tính).

**Không có build** (đã xoá build mặc định): lấy skill mới cho tới khi đủ ô > Learning > dồn nâng cấp skill đang có (cấp cao trước) > nội tại cần để tiến hoá > nội tại tấn công > nội tại phòng thủ. Skill không gây sát thương xếp sau. Thẻ tiến hoá vẫn được ưu tiên nhất.

Số ô move: bản thường đọc từ game (thường 4, nâng cấp được), pokesurvivor.doofcraft.com tính là 4. Các move đã **bond** chỉ chiếm chung 1 ô, nên sau khi bond bot lại lấy thêm move mới. Game chỉ đưa thẻ move mới khi còn ô trống, nên thấy thẻ đó là bot biết còn chỗ.

Bot luôn kèm chế độ farm xu: được cộng thêm điểm cho nội tại hút đồ / kinh nghiệm / xu, nhưng điểm cộng này không bao giờ vượt qua thứ tự build ở trên.

**Trên pokesurvivor.com** bot đọc được thẻ thật của game, nên thêm 3 luật đứng trên thứ tự ở trên:
- **Baya Zidra** (hồi 45% máu) khi máu dưới 35%: đứng đầu.
- Nội tại mà **lấy là tiến hoá ngay** một move đã max: ngay sau thẻ tiến hoá.
- **Coraza** (giáp, -6% sát thương nhận vào mỗi thẻ, tối đa 70%): trước mọi nâng cấp move, chỉ sau move build chưa có. Đầy 70% thì thôi.

### Cách bot chơi trên pokesurvivor.com

Bot đọc trạng thái thật của game thay vì nhìn màn hình. Cách lái dựa trên [pokesurvivor-autofarm](https://github.com/BoundlessEgret/pokesurvivor-autofarm) (MIT):
- **Né:** chấm 16 hướng, dự đoán quái đuổi tới đâu và vùng skill nổ lúc nào (lúc nó nổ mình đứng ở đâu). Máu càng thấp càng sợ quái thường; boss, đạn, vùng skill thì luôn né.
- **Mục tiêu:** Gholdengo > rift > cứu pokémon lạc / Meowth > buff, hồ hồi máu (máu < 60%), rương lớn > nhặt đồ. Đường đi tính bằng A* trên địa hình thật; không tới kịp trước khi mục tiêu biến mất thì bỏ.
- Đứng chỗ bắn không bị tường / cây chặn. Quái đông thì chạy vòng tròn lớn, kéo quái theo sau.
- **Rift** và **Arceus** (phút 30): chạy vòng trong sân, giữ boss ở phía đối diện.
- **Orb:** orb khống chế khi máu dưới 40% hoặc bị 8 quái vây, orb buff khi có boss (trước đây bot bấm 5–8 liên tục nên dùng hết ngay).
- Game tự pause khi mất focus thì bot tự chơi tiếp (trừ khi bạn tự bấm Esc / P).

Không có trạng thái game (bookmarklet, doofcraft) thì bot dùng cách cũ: đọc màn hình.

## Cập nhật

- **Máy tính:** khi panel hiện dòng vàng "⬆ Có bản mới", tải lại ZIP ở bước 1 rồi giải nén đè lên thư mục cũ.
- **Điện thoại:** trình quản lý userscript tự cập nhật định kỳ (hoặc bấm **Check for updates**).

Cần cài hộ: liên hệ [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
