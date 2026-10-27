# PokeSurvivor Bot

**Tiếng Việt** · [English](README.en.md)

Bot tự chơi [pokesurvivor.com](https://pokesurvivor.com/) và [pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/) (tự nhận bản game theo trang). Miễn phí · tác giả [damhieu2808](https://github.com/damhieu2808)

## Cài trên máy tính (Chrome)

1. [**Tải bot (ZIP)**](https://github.com/damhieu2808/PokeSurvivorTool/archive/refs/heads/release.zip). Link này luôn tải bản mới nhất.
2. Giải nén, mở `chrome://extensions`, bật **Developer mode**.
3. Bấm **Load unpacked**, chọn thư mục vừa giải nén.

## Cài trên điện thoại (Android)

> ℹ️ **pokesurvivor.com chặn script chèn vào trang** (CSP), nên trên Android phải dùng **Firefox**: bot chạy bằng quyền của userscript, không cần chèn script. **Kiwi / Chrome trên Android không chạy được** với bản thường (doofcraft vẫn chạy bình thường trên mọi trình duyệt).

1. Cài **Firefox** (CH Play).
2. Trong Firefox, cài tiện ích **Violentmonkey** hoặc **Tampermonkey** (menu ⋮ → Tiện ích / Add-ons).
3. Bấm nút copy ở góc khối dưới đây, dán vào **thanh địa chỉ** của trình duyệt đó rồi mở:

```
https://raw.githubusercontent.com/damhieu2808/PokeSurvivorTool/release/psbot.user.js
```

4. Tampermonkey tự mở trang cài script → bấm **Install** (Cài đặt).
5. Vào game. Lần đầu, Tampermonkey hỏi quyền truy cập `raw.githubusercontent.com` (nơi bot tải code): chọn **Always allow** (luôn cho phép) rồi tải lại trang. Không cho phép thì bot không chạy.
6. Panel **PokeSurvivor Bot** hiện ở góc trên bên trái.

## Cài trên iPhone / iPad

1. Cài app **Userscripts** (App Store, miễn phí).
2. Mở **Cài đặt → Safari → Tiện ích → Userscripts**: bật lên và cho phép trên mọi trang web.
3. Trong **Safari**, dán link ở bước 3 phần Android vào thanh địa chỉ rồi mở.
4. Bấm biểu tượng tiện ích (hình mảnh ghép hoặc **aA**) trên thanh địa chỉ → **Userscripts** → **Cài đặt** (Install).
5. Vào game trong Safari: panel hiện ở góc trên bên trái. iOS chưa thử; pokesurvivor.com có thể bị chặn như trên Android. Nếu lỗi, báo qua liên hệ bên dưới.

## Dùng

Nhập **Số ván** (0 = chơi mãi) rồi bấm **▶ Chạy**, bấm lại để **■ Dừng**. **⚔ Moveset** để chọn 4 move bot ưu tiên cho từng pokémon. Phím tắt trên máy tính: **F8** bật/tắt bot, **F9** hiện lớp vẽ (bot đang thấy gì).

**🎃 Event Halloween:** nút này bấm được khi game đang có event, còn lại thì bị khoá.
- **[pokesurvivor.doofcraft.com](https://pokesurvivor.doofcraft.com/):** chạy chế độ Waves của event.
- **[pokesurvivor.com](https://pokesurvivor.com/):** từ 30/10 đến 1/11 mọi trận đều là trận Halloween, nút chạy như ▶ Chạy.

> ⚠️ **Bot 1.5.0–1.5.6 chuyển pokesurvivor.com sang `/dev.html`.** Từ 26/10, trang này của game không còn dùng tài khoản (không lưu lên cloud, không lên bảng xếp hạng). Từ bản 1.5.7, bot đưa bạn về trang chính. Nếu thấy địa chỉ là `pokesurvivor.com/dev.html`, hãy cập nhật bot rồi mở lại `pokesurvivor.com`.

### Bot chọn thẻ lên cấp thế nào

Mỗi lần lên cấp, bot chấm điểm từng thẻ rồi chọn thẻ điểm cao nhất. Lý do mỗi lần chọn hiện trong console (F12), ví dụ `chọn 2 Psychic — lấy move build #2`.

**Có Moveset cho pokémon đang chơi** (bot nhận ra pokémon qua tên trên HUD; nút 🎯 trong popup lấy tên đó). Pokémon nào chưa tự đặt Moveset thì dùng build mặc định: build tốt nhất mà [SurvivorTiers](https://survivortiers.pages.dev/en/) tìm ra qua các trận mô phỏng (làm mới bằng `node crawl-moves.js --builds`). Thứ tự ưu tiên, tầng trên luôn thắng tầng dưới:

1. Thẻ **tiến hoá** một skill.
2. **Lấy move trong build** chưa có (#1 trước #2…).
3. **Lấy move mới ngoài build khi còn ô trống**: bot dùng xoay vòng mọi move, nên càng đủ ô (thường 4) càng nhiều đòn. Ô của các move build chưa có luôn được giữ lại; ví dụ build 2 move thì bot lấy thêm 2 move bất kỳ, build đủ 4 move thì không lấy move ngoài.
4. **Learning** (nội tại tăng kinh nghiệm nhận được): thêm cấp nhanh hơn, nên đứng trước mọi nâng cấp.
5. **Nâng cấp move tấn công** trong build (#1 trước).
6. **Nội tại mà move trong build cần để tiến hoá** (ví dụ Magnet cho Psychic), khi đã có move đó và chưa có nội tại.
7. **Nâng cấp move buff** (không gây sát thương) trong build.
8. Nội tại khác: tấn công (sát thương, hồi chiêu, tầm…) > phòng thủ (máu, hồi máu, giáp, tốc độ, hút…) > còn lại.
9. Nâng cấp skill ngoài build (cấp cao trước).
10. Skill mới ngoài build khi đã hết ô: chỉ lấy khi không còn gì khác. Nếu cả 3 thẻ đều thuộc loại này và còn lượt **Reroll** thì bot đổi thẻ (máy tính).

**Không có build** (đã xoá build mặc định): lấy skill mới cho tới khi đủ ô > Learning > dồn nâng cấp skill đang có (cấp cao trước) > nội tại cần để tiến hoá > nội tại tấn công > nội tại phòng thủ. Skill không gây sát thương xếp sau. Thẻ tiến hoá vẫn được ưu tiên nhất.

Số ô move: bản thường đọc từ game (thường 4, nâng cấp được), pokesurvivor.doofcraft.com tính là 4. Các move đã **bond** chỉ chiếm chung 1 ô, nên sau khi bond bot lại lấy thêm move mới. Game chỉ đưa thẻ move mới khi còn ô trống, nên thấy thẻ đó là bot biết còn chỗ.

Bot luôn kèm chế độ farm xu: được cộng thêm điểm cho nội tại hút đồ / kinh nghiệm / xu, nhưng điểm cộng này không bao giờ vượt qua thứ tự build ở trên.

## Cập nhật

- **Máy tính:** khi panel hiện dòng vàng "⬆ Có bản mới", tải lại ZIP ở bước 1 rồi giải nén đè lên thư mục cũ.
- **Điện thoại:** tự cập nhật, không cần làm gì.

Cần cài hộ: liên hệ [TikTok @phuongnguyenconhat](https://www.tiktok.com/@phuongnguyenconhat) · [MIT](LICENSE)
