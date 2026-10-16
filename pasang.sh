#!/usr/bin/env bash
# Pemasang dan pembaru Asisten Guru untuk macOS dan Linux (OpenCode 2).
# Pakai: curl -fsSL https://raw.githubusercontent.com/pratomobowo/perangkat-ajar-guru-SD/main/pasang.sh | bash
# Butuh curl dan unzip (atau python3). Kompatibel dengan bash 3.2 bawaan macOS.
#
# Aturan (sama dengan .opencode/lib/paket.ts):
# - .opencode/ dan berkas paket di akar diganti versi baru; yang lama dicadangkan di .cadangan/.
# - sekolah/ hanya ditambah berkas yang belum ada. guru/ dan hasil/ tidak pernah disentuh.
# Opsional: ASISTEN_GURU_DIR (folder tujuan), ASISTEN_GURU_ZIP (berkas/URL zip, untuk uji).
set -euo pipefail

REPO=pratomobowo/perangkat-ajar-guru-SD
BERKAS_AKAR="AGENTS.md opencode.json PANDUAN-GURU.md README-PASANG.md VERSI.md"
DIABAIKAN='^\.opencode/(node_modules/|package\.json$|package-lock\.json$|bun\.lock$|\.gitignore$)'
tulis() { echo "[Asisten Guru] $*"; }

TUJUAN=${ASISTEN_GURU_DIR:-$HOME/Documents/AsistenGuru}
mkdir -p "$TUJUAN"; TUJUAN=$(cd "$TUJUAN" && pwd)
KERJA=$(mktemp -d "${TMPDIR:-/tmp}/asisten-guru-XXXXXX")
trap 'rm -rf "$KERJA"' EXIT

# 1. Unduh rilis terbaru (tag vX.Y.Z).
ZIP=$KERJA/paket.zip
if [[ -n ${ASISTEN_GURU_ZIP:-} && -f ${ASISTEN_GURU_ZIP} ]]; then
  cp "$ASISTEN_GURU_ZIP" "$ZIP"
else
  URL=${ASISTEN_GURU_ZIP:-}
  if [[ -z $URL ]]; then
    TAG=$(curl -fsSL -H 'User-Agent: asisten-guru' "https://api.github.com/repos/$REPO/tags?per_page=100" |
      grep -o '"name": *"v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*"' | sed 's/.*"\(v[^"]*\)"/\1/' |
      awk -F'[v.]' '{ printf "%05d%05d%05d %s\n", $2, $3, $4, $0 }' | sort | tail -1 | cut -d' ' -f2)
    [[ -n $TAG ]] || { tulis "Belum ada rilis Asisten Guru di GitHub."; exit 1; }
    URL=https://github.com/$REPO/archive/refs/tags/$TAG.zip
  fi
  tulis "Mengunduh $URL"
  curl -fsSL -H 'User-Agent: asisten-guru' -o "$ZIP" "$URL"
fi

# 2. Ekstrak dan temukan folder AsistenGuru di dalam arsip.
mkdir -p "$KERJA/isi"
if command -v unzip > /dev/null; then unzip -q "$ZIP" -d "$KERJA/isi"
elif command -v python3 > /dev/null; then python3 -I -m zipfile -e "$ZIP" "$KERJA/isi"
else tulis "Butuh unzip atau python3 untuk mengekstrak paket."; exit 1; fi
PENANDA=$(find "$KERJA/isi" -path '*/AsistenGuru/opencode.json' | head -1)
[[ -n $PENANDA ]] || { tulis "Arsip yang diunduh bukan paket Asisten Guru."; exit 1; }
SUMBER=$(dirname "$PENANDA")
versi() { [[ -f $1 ]] && sed -n 's/.*"versi": *"\([^"]*\)".*/\1/p' "$1" | head -1 || true; }
VERSI_BARU=$(versi "$SUMBER/.opencode/paket.json")

daftar() { [[ -d $1 ]] && (cd "$1" && find . -type f | sed 's|^\./||') || true; }
BARU=$(daftar "$SUMBER")

# 3. Cadangkan berkas paket lama.
VERSI_LAMA=$(versi "$TUJUAN/.opencode/paket.json")
LAMA=$( { daftar "$TUJUAN/.opencode" | sed 's|^|.opencode/|' | grep -Ev "$DIABAIKAN" || true
          for f in $BERKAS_AKAR; do if [[ -f $TUJUAN/$f ]]; then echo "$f"; fi; done; } )
CADANGAN=
if [[ -n $LAMA ]]; then
  CADANGAN=".cadangan/$(date '+%Y-%m-%d %H%M%S') v${VERSI_LAMA:-lama}"
  while IFS= read -r rel; do
    mkdir -p "$(dirname "$TUJUAN/$CADANGAN/$rel")"
    cp "$TUJUAN/$rel" "$TUJUAN/$CADANGAN/$rel"
  done <<< "$LAMA"
  ls -1 "$TUJUAN/.cadangan" | sort | awk -v n="$(ls -1 "$TUJUAN/.cadangan" | wc -l)" 'NR <= n - 3' | while IFS= read -r tua; do
    rm -rf "$TUJUAN/.cadangan/$tua"
  done
fi

# 4. Salin berkas baru sesuai aturan.
DITULIS=0; SEKOLAH_BARU=
while IFS= read -r rel; do
  dari=$SUMBER/$rel; ke=$TUJUAN/$rel
  case $rel in
    guru/*|hasil/*) [[ -e $ke ]] || { mkdir -p "$(dirname "$ke")"; cp "$dari" "$ke"; }; continue ;;
    .opencode/*) ;;
    */*) [[ -e $ke ]] && continue; SEKOLAH_BARU="$SEKOLAH_BARU $rel" ;;
  esac
  mkdir -p "$(dirname "$ke")"; cp "$dari" "$ke"; DITULIS=$((DITULIS + 1))
done <<< "$BARU"

# 5. Hapus berkas paket lama yang tidak ada di versi baru, lalu folder kosong di .opencode.
DIHAPUS=0
if [[ -n $LAMA ]]; then
  while IFS= read -r rel; do
    grep -qxF "$rel" <<< "$BARU" || { rm -f "$TUJUAN/$rel"; DIHAPUS=$((DIHAPUS + 1)); }
  done <<< "$LAMA"
fi
find "$TUJUAN/.opencode" -mindepth 1 -type d -empty -delete 2>/dev/null || true

# 6. Laporan untuk guru dan asisten AI.
if [[ -n $VERSI_LAMA ]]; then tulis "Diperbarui dari versi $VERSI_LAMA ke $VERSI_BARU di: $TUJUAN"
else tulis "Terpasang versi $VERSI_BARU di: $TUJUAN"; fi
tulis "$DITULIS berkas paket ditulis, $DIHAPUS berkas lama dihapus."
[[ -n $CADANGAN ]] && tulis "Berkas paket lama dicadangkan di $CADANGAN"
[[ -n $SEKOLAH_BARU ]] && tulis "Berkas sekolah baru:$SEKOLAH_BARU"
tulis "Data guru, hasil, dan isian sekolah tidak diubah."
if command -v opencode > /dev/null; then
  V=$(opencode --version 2>/dev/null || true)
  [[ $V =~ ^v?1\. ]] && tulis "PERHATIAN: OpenCode $V terdeteksi. Asisten Guru butuh OpenCode 2. Pasang dari https://opencode.ai/download"
fi
tulis "Langkah berikutnya: buka folder di atas sebagai proyek di OpenCode (Desktop: Open Project; terminal: cd ke folder itu lalu ketik opencode), lalu ketik /mulai."
echo "ASISTEN_GURU_SELESAI versi=$VERSI_BARU folder=$TUJUAN"
