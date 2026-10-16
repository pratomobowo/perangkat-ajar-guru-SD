# Referensi Resmi

Folder ini satu-satunya sumber regulasi bagi asisten.

## Cara mengisi CP (operator atau waka kurikulum)
1. Unduh CP resmi dari situs Kemendikdasmen: Keputusan Kepala BSKAP No. 046/H/KR/2025 beserta lampirannya.
2. Salin teks CP fase yang dibutuhkan ke `cp/<kode-mapel>-fase-<huruf>.md`, satu mapel dan satu fase per berkas
   (misalnya `matematika-fase-b.md`, `bahasa-indonesia-fase-b.md`). Kode mapel harus sama dengan `kode` di profil guru.
3. Isi frontmatter, terutama:
   - `elemen:` daftar nama elemen dipisah titik koma, persis seperti di dokumen resmi. Asisten memakainya untuk memeriksa
     bahwa semua elemen tercakup di ATP.
   - `status:` ubah menjadi `TERVERIFIKASI` hanya setelah teks dibandingkan dengan dokumen resmi oleh orang yang berwenang.
     Selama belum terverifikasi, semua dokumen perencanaan berlabel DRAF.
4. Jangan menyalin dari blog atau contoh ATP di internet. Banyak yang masih memakai CP 2022.

Jika CP resmi diganti, perbarui berkasnya lalu isi ulang `diverifikasi_oleh` dan `tanggal_verifikasi`.
