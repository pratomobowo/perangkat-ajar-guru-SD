#!/usr/bin/env bash
# Pakai: jalankan.sh <label> "<pesan guru>" [lanjut]
# Menjalankan OpenCode 2 terisolasi (HOME kosong, tanpa skill/plugin global) di workspace uji.
# "lanjut" = meneruskan sesi terakhir (percakapan multi-giliran). Perintah slash cukup ditulis di pesan, misalnya "/absen oktober".
# Wajib: WS (salinan AsistenGuru yang sudah di-git init) dan ISO (folder HOME terisolasi).
# Opsional: MODEL, LOGDIR, BATAS (detik), PORT (port service terisolasi, bawaan 49601 agar tidak bentrok dengan service utama).
set -u
LABEL=$1; PESAN=$2; MODE=${3:-baru}
DIR=$(cd "$(dirname "$0")" && pwd)
WS=${WS:?set WS ke folder workspace uji}
ISO=${ISO:?set ISO ke folder HOME terisolasi}
MODEL=${MODEL:-opencode/muse-spark-1.3-contributor-free}
LOG=${LOGDIR:-$DIR/log}; mkdir -p "$LOG"

ARGS=(--auto -m "$MODEL" --format json)
if [[ $MODE == lanjut ]]; then ARGS+=(--session "$(cat "$LOG/.sesi")"); fi

ISOENV=(HOME="$ISO" XDG_CONFIG_HOME="$ISO/.config" XDG_DATA_HOME="$ISO/.local/share" XDG_STATE_HOME="$ISO/.local/state" XDG_CACHE_HOME="$ISO/.cache")
if ! env "${ISOENV[@]}" opencode service get 2>/dev/null | grep -q "\"port\": ${PORT:-49601}\b"; then
  env "${ISOENV[@]}" opencode service set port "${PORT:-49601}" > /dev/null
fi

cd "$WS"
# Pemanasan: run pertama yang dikirim saat service baru menyala bisa tidak pernah diproses, jadi tunggu service siap dulu.
for _ in 1 2 3 4 5 6; do env "${ISOENV[@]}" timeout 20 opencode api GET /api/info > /dev/null 2>&1 && break; sleep 5; done
printf '%s\n' "$PESAN" > "$LOG/$LABEL.pesan.txt"
env "${ISOENV[@]}" timeout "${BATAS:-480}" opencode run "${ARGS[@]}" "$PESAN" > "$LOG/$LABEL.jsonl" 2> "$LOG/$LABEL.err"
echo "exit=$?" >> "$LOG/$LABEL.err"
SESI=$(grep -o '"sessionID":"[^"]*"' "$LOG/$LABEL.jsonl" | head -1 | cut -d'"' -f4); [[ -n $SESI ]] && echo "$SESI" > "$LOG/.sesi"

{
  echo "# $LABEL"; echo "PESAN GURU: $PESAN"; echo
  python3 -I "$DIR/ringkas.py" "$LOG/$LABEL.jsonl"
  echo; echo "--- perubahan berkas di workspace ---"
  git -C "$WS" status --short --untracked-files=all
} > "$LOG/$LABEL.md"
cat "$LOG/$LABEL.md"
