# design/

Sumber gaya bersama agar form.umpomenfess.my.id terasa satu keluarga dengan umpomenfess.my.id.

- `tokens.css` : CSS variables (warna, font, radius, spasi, bayangan). SEMENTARA, lihat catatan di dalamnya.
- `reference/` : file mentah yang disalin MANUSIA dari repo menfess (CSS, logo, font, contoh komponen).

## Yang sudah diketahui dari situs utama
- Nama: umpomenfess, "Menfess Anonim Mahasiswa Universitas Muhammadiyah Ponorogo"
- Warna tema: #BFE8EA (aqua pastel)
- Nada tulisan: santai, bahasa sehari-hari ("Fess!", "yaa", "sabar sedikit ya ✨")
- Pola visual: label seksi berawalan "✦", heading besar, kartu bergaya postingan Instagram, navigasi: Cara Kerja / Buat Fess / Papan / Cek Status / FAQ, footer "© 2026 umpomenfess ✦ Universitas Muhammadiyah Ponorogo"

## Aturan
- Halaman memakai variabel dari tokens.css, jangan hardcode warna/font.
- Tema buatan pembuat form hanya boleh menimpa variabel yang diizinkan (lihat TASK.md 4.5).
