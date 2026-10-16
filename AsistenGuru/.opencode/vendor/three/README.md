# three.js r162 (MIT)

Bundel kecil three.js untuk peraga 3D di media interaktif (bangun ruang, kubus satuan). Disisipkan ke dalam berkas
HTML media hanya jika media itu memakai bagian `ruang` atau `volume`, supaya HTML tetap satu berkas dan berjalan tanpa
internet.

- Sumber: paket npm `three@0.162.0` (https://github.com/mrdoob/three.js), lisensi MIT (lihat `LICENSE`).
- Versi r162 dipilih karena masih mendukung WebGL 1 (r163 ke atas hanya WebGL 2) — penting untuk smart TV/papan
  sentuh yang lebih lama.
- Hanya kelas yang tercantum di `entri.js` yang ikut. Membangun ulang (butuh Bun dan `three@0.162.0` di node_modules):

```sh
bun build entri.js --minify --format=iife --target=browser --outfile=three-sd.min.js
```
