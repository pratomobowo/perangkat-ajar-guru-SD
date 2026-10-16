#!/usr/bin/env bash
# Uji pemasang Asisten Guru: alat perbarui_paket (TypeScript), pasang.sh, dan pasang.ps1 (jika pwsh tersedia, atau PWSH=...).
# Skenario per pemasang: pasang baru, pembaruan dari v0.2 berisi data guru/sekolah, pemasangan ulang, dan batas cadangan.
# Pakai: uji-e2e/pasang/uji-pasang.sh   (dari mana saja; memakai isi index git saat ini sebagai "rilis baru")
set -u
DIR=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$DIR/../.." && pwd)
KERJA=$(mktemp -d); trap 'rm -rf "$KERJA"' EXIT
PWSH=${PWSH:-$(command -v pwsh || true)}
VERSI=$(sed -n 's/.*"versi": *"\([^"]*\)".*/\1/p' "$REPO/AsistenGuru/.opencode/paket.json")

# Arsip seperti yang dibuat GitHub untuk tag (git archive memakai .gitattributes export-ignore).
git -C "$REPO" add -A
git -C "$REPO" archive --format=zip --prefix=perangkat-ajar-guru-SD-$VERSI/ -o "$KERJA/baru.zip" "$(git -C "$REPO" write-tree)"
git -C "$REPO" archive --format=zip --prefix=perangkat-ajar-guru-SD-0.2.0/ -o "$KERJA/v02.zip" 88cf711

GAGAL=0
cek() { if eval "$2"; then echo "  ✔ $1"; else echo "  ✖ $1"; GAGAL=$((GAGAL + 1)); fi; }

pasang() { # <pemasang> <zip> <tujuan>
  case $1 in
    ts) bun "$DIR/pasang-ts.ts" "$2" "$3" > /dev/null ;;
    sh) ASISTEN_GURU_ZIP=$2 ASISTEN_GURU_DIR=$3 bash "$REPO/pasang.sh" > "$KERJA/log" 2>&1 ;;
    ps1) ASISTEN_GURU_ZIP=$2 ASISTEN_GURU_DIR=$3 "$PWSH" -NoProfile -File "$REPO/pasang.ps1" > "$KERJA/log" 2>&1 ;;
  esac
}

cek_arsip_ramping() { unzip -l "$KERJA/baru.zip" | grep -q "uji-e2e/" && return 1 || return 0; }
echo "== arsip rilis"; cek "uji-e2e tidak ikut di arsip rilis" cek_arsip_ramping

for P in ts sh ps1; do
  if [[ $P == ps1 && -z $PWSH ]]; then echo "== ps1: dilewati (pwsh tidak ada)"; continue; fi
  echo "== $P"
  T=$KERJA/$P-baru
  pasang $P "$KERJA/baru.zip" "$T"; echo "     (exit $?)"
  cek "pasang baru: plugin dan alat ada" "[[ -f '$T/.opencode/plugins/asisten-guru.ts' && -f '$T/.opencode/alat/perbarui_paket.ts' ]]"
  cek "pasang baru: versi $VERSI" "grep -q '\"versi\": \"$VERSI\"' '$T/.opencode/paket.json'"
  cek "pasang baru: folder guru, hasil, sekolah" "[[ -d '$T/guru' && -d '$T/hasil' && -f '$T/sekolah/kebijakan.json' ]]"
  cek "pasang baru: tanpa cadangan" "[[ ! -d '$T/.cadangan' ]]"
  [[ $P != ts ]] && cek "pasang baru: penanda selesai untuk AI" "grep -q 'ASISTEN_GURU_SELESAI versi=$VERSI' '$KERJA/log'"

  U=$KERJA/$P-update
  pasang sh "$KERJA/v02.zip" "$U" # instalasi lama v0.2
  echo '{"nama_sekolah": "SDIT Uji Isian Sekolah"}' > "$U/sekolah/kebijakan.json"
  echo '{"nama_panggilan": "Bu Uji"}' > "$U/guru/profil.json"
  mkdir -p "$U/hasil/4 Administrasi"; echo excel-guru > "$U/hasil/4 Administrasi/Daftar Hadir.xlsx"
  echo catatan > "$U/catatan-guru.txt"
  mkdir -p "$U/.opencode/node_modules/x"; echo "//" > "$U/.opencode/node_modules/x/index.js"; echo "{}" > "$U/.opencode/package.json"
  pasang $P "$KERJA/baru.zip" "$U"; echo "     (exit $?)"
  cek "perbarui: alat lama .opencode/tools dihapus" "[[ ! -e '$U/.opencode/tools' ]]"
  cek "perbarui: plugin baru ada" "[[ -f '$U/.opencode/plugins/asisten-guru.ts' ]]"
  cek "perbarui: opencode.json format v2" "grep -q '\"permissions\"' '$U/opencode.json'"
  cek "perbarui: isian sekolah tidak ditimpa" "grep -q 'SDIT Uji Isian Sekolah' '$U/sekolah/kebijakan.json'"
  cek "perbarui: data guru utuh" "grep -q 'Bu Uji' '$U/guru/profil.json' && grep -q excel-guru '$U/hasil/4 Administrasi/Daftar Hadir.xlsx'"
  cek "perbarui: berkas lain di akar tidak dihapus" "[[ -f '$U/catatan-guru.txt' ]]"
  cek "perbarui: node_modules lama dibiarkan" "[[ -d '$U/.opencode/node_modules/x' ]]"
  cek "perbarui: cadangan berisi alat lama" "ls '$U'/.cadangan/*/.opencode/tools/ekspor_word.ts > /dev/null 2>&1"
  cek "perbarui: cadangan bukan data guru" "! ls '$U'/.cadangan/*/guru > /dev/null 2>&1"
  for i in 1 2 3 4; do sleep 1; pasang $P "$KERJA/baru.zip" "$U"; done
  cek "pasang ulang: tetap $VERSI dan lengkap" "grep -q '$VERSI' '$U/.opencode/paket.json' && [[ -f '$U/.opencode/alat/ekspor_word.ts' ]]"
  cek "pasang ulang: cadangan paling banyak 3" "[[ \$(ls -1 '$U/.cadangan' | wc -l) -le 3 ]]"
  cek "pasang ulang: tidak ada berkas berlebih di .opencode" "diff <(cd '$T/.opencode' && find . -type f | sort) <(cd '$U/.opencode' && find . -type f ! -path './node_modules/*' ! -name package.json | sort) > /dev/null"
done

echo; if ((GAGAL)); then echo "$GAGAL pemeriksaan GAGAL"; exit 1; else echo "Semua pemeriksaan lulus"; fi
