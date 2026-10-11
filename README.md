# Du Lịch Vòng Quanh Marie Curie 🗺️

Web dạy học **Lý thuyết đồ thị** (chu trình Hamilton, đường đi Hamilton, bài toán người du lịch – TSP) qua bối cảnh thực tế: lên lộ trình tham quan các địa điểm du lịch ở TP. Hồ Chí Minh.

- 🌐 Bản đang chạy: **https://dulichmarie.vercel.app**
- 👨‍🏫 Tác giả: Thầy Đô Nguyên – Trường THPT Marie Curie
- 📄 Giấy phép: [MIT](LICENSE) – thầy cô được **tự do dùng, sửa, chia sẻ**, chỉ cần giữ lại dòng ghi tác giả.

## Web làm được gì?

| Bài | Bài toán | Ý nghĩa thực tế |
|---|---|---|
| Bài 1 | Chu trình Hamilton ngắn nhất | Đi qua tất cả các điểm đã chọn rồi quay về điểm xuất phát |
| Bài 2 | Đường đi Hamilton ngắn nhất | Đi từ A đến B, ghé đủ các điểm đã chọn |
| Bài 3 | Lộ trình trên tập con (TSP) | Học sinh tự chọn nhóm địa điểm muốn tham quan |

Học sinh chọn địa điểm → web chạy thuật toán → hiển thị **lời giải từng bước** trên đồ thị và trên bản đồ. Có song ngữ Việt/Anh.

---

## Cách 1 – Có ngay web riêng trong 3 phút (không cần cài gì)

1. Tạo tài khoản miễn phí tại [github.com](https://github.com) và [vercel.com](https://vercel.com) (đăng nhập Vercel bằng GitHub cho nhanh).
2. Bấm nút dưới đây:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/NguyenTuDo/THAOGIANG-TOAN&project-name=du-lich-do-thi&repository-name=du-lich-do-thi)

3. Đặt tên dự án → bấm **Create / Deploy**. Khoảng 1 phút sau thầy cô có link riêng dạng `ten-du-an.vercel.app`.

Vercel sẽ tự chép toàn bộ mã nguồn sang tài khoản GitHub của thầy cô. Từ đó, **mỗi lần sửa file trên GitHub, web tự cập nhật**.

## Cách 2 – Chạy trên máy tính của mình

Cần cài [Node.js](https://nodejs.org) (bản LTS). Sau đó mở Terminal/PowerShell:

```bash
git clone https://github.com/NguyenTuDo/THAOGIANG-TOAN.git
cd THAOGIANG-TOAN
npm install
npm run dev
```

Mở trình duyệt vào **http://localhost:3000**. (Không có Git thì bấm nút xanh **Code → Download ZIP** trên GitHub, giải nén rồi chạy từ lệnh `npm install`.)

Muốn tạo bản để đưa lên mạng: `npm run build` → thư mục `dist/` chính là web hoàn chỉnh, có thể chép lên bất kỳ hosting tĩnh nào (Vercel, Netlify, GitHub Pages…).

---

## Đổi sang địa phương / trường của mình

Toàn bộ dữ liệu nằm trong **một file duy nhất**: [`src/data/hcmcLocations.ts`](src/data/hcmcLocations.ts). Không cần cơ sở dữ liệu, không cần khóa API.

**1. Địa điểm** (`INITIAL_LOCATIONS`) – mỗi địa điểm là một khối:

```ts
{
  "id": "MC",                       // mã ngắn, không trùng
  "label": "Marie",                 // tên ngắn hiện trên đồ thị
  "fullName": "THPT Marie Curie",
  "category": "Di sản học đường",
  "description": "Giới thiệu chi tiết…",
  "shortIntro": "Một câu giới thiệu ngắn",
  "imageUrl": "https://…/anh.jpg",   // hoặc "/images/ten-file.jpg" nếu để ảnh trong public/images
  "lat": 10.7824, "lng": 106.6908,   // tọa độ – lấy từ Google Maps (chuột phải → bấm vào tọa độ)
  "x": 263, "y": 256,                // vị trí đỉnh trên hình đồ thị
  "displayOrder": 0
  // các trường …En là bản tiếng Anh (không bắt buộc)
}
```

**2. Đường đi** (`INITIAL_ROUTES`) – mỗi cạnh của đồ thị:

```ts
{ "id": "MC__DL", "from": "MC", "to": "DL", "distanceKm": 1.2 }
```

`from`/`to` là `id` của địa điểm; `distanceKm` là trọng số cạnh (khoảng cách thực tế).

**3. Bộ chọn mẫu** (`PRESET_SELECTIONS`) – các địa điểm và cạnh được chọn sẵn cho từng bài khi học sinh mở web.

**4. Tên web**: sửa thẻ `<title>` trong [`index.html`](index.html).

> 💡 **Mẹo:** Có thể vào trang quản trị **`/admin`** (ví dụ `http://localhost:3000/admin`) để thêm/sửa địa điểm, cạnh bằng giao diện. Lưu ý: chỉnh trong `/admin` **chỉ lưu trên trình duyệt đang dùng**. Muốn mọi học sinh thấy, phải ghi thay đổi vào file `src/data/hcmcLocations.ts` rồi build/deploy lại.
>
> Trang `/admin` không có mật khẩu, nên nó chỉ dùng để soạn dữ liệu, không phải để bảo mật.

## Cấu trúc mã nguồn

```
src/
├── algorithms/   # Thuật toán: hamiltonianCycle, hamiltonianPath, subsetRoute
├── components/   # Giao diện (đồ thị D3, bản đồ Leaflet, bảng lời giải từng bước…)
├── pages/        # Trang học sinh (GuidebookPage) và trang quản trị (AdminPage)
├── data/         # ⭐ Dữ liệu địa điểm & đường đi – file thầy cô cần sửa
├── contexts/     # Ngôn ngữ Việt/Anh, chế độ quản trị
└── lib/          # Lưu dữ liệu, tính toán tọa độ, màu đồ thị
```

Công nghệ: React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · D3 · Leaflet.

## Đóng góp

Thầy cô có cải tiến (thêm thuật toán, thêm bộ dữ liệu tỉnh khác, sửa lỗi…) xin mở *Issue* hoặc *Pull Request* trên GitHub để mọi người cùng dùng. Nếu dùng trong tiết thao giảng/bài báo, rất mong thầy cô ghi nguồn. Cảm ơn!
