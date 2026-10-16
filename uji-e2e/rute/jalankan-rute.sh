#!/usr/bin/env bash
# Uji pemilihan alat dari bahasa sehari-hari (tanpa perintah garis miring).
# Tiap baris permintaan.tsv (id, pesan guru, alat/skill yang diharapkan dipisah "|") dijalankan di sesi OpenCode baru,
# lalu dicatat alat dan skill yang benar-benar dipakai. Butuh WS dan ISO seperti jalankan.sh (workspace berisi profil,
# kalender, ATP, Daftar Siswa, dan buku nilai/absensi yang sudah diisi supaya semua jalur bisa diuji).
# Pakai: WS=... ISO=... bash jalankan-rute.sh   → hasil di $LOGDIR/rute.tsv dan ringkasan cocok/tidak di layar.
set -u
DIR=$(cd "$(dirname "$0")" && pwd)
export LOGDIR=${LOGDIR:-$DIR/log} BATAS=${BATAS:-240}
mkdir -p "$LOGDIR"; : > "$LOGDIR/rute.tsv"
cocok=0; total=0
while IFS=$'\t' read -r id pesan harap; do
  bash "$DIR/../jalankan.sh" "$id" "$pesan" > /dev/null 2>&1
  pakai=$(grep -o '"tool":"[^"]*"' "$LOGDIR/$id.jsonl" | cut -d'"' -f4 | grep -v '^read$\|^glob$\|^question$\|^skill$' | uniq | tr '\n' ' ')
  skill=$(grep "skill dimuat" "$LOGDIR/$id.md" | sed 's/.*: //')
  ok=0; IFS='|' read -ra calon <<< "$harap"
  for c in "${calon[@]}"; do [[ " $pakai $skill " == *"$c"* ]] && ok=1; done
  total=$((total + 1)); cocok=$((cocok + ok))
  printf '%s\t%s\t%s\t%s\t%s\n' "$id" "$([[ $ok == 1 ]] && echo COCOK || echo MELESET)" "$harap" "$pakai" "$skill" | tee -a "$LOGDIR/rute.tsv"
done < "$DIR/permintaan.tsv"
echo "Cocok: $cocok/$total"
