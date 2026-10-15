#!/bin/zsh
# Pakai: [CMD=perintah] jalankan.sh <label> "<pesan guru>" [lanjut]
# Menjalankan OpenCode terisolasi (tanpa skill/plugin global) di workspace uji.
# "lanjut" = meneruskan sesi terakhir (percakapan multi-giliran).
set -u
LABEL=$1; PESAN=$2; MODE=${3:-baru}
DIR=${0:A:h}
WS=${WS:?set WS ke folder workspace uji}
ISO=${ISO:?set ISO ke folder HOME terisolasi}
MODEL=${MODEL:-opencode/muse-spark-1.3-contributor-free}
LOG=${LOGDIR:-$DIR/log}; mkdir -p $LOG

ARGS=(--pure --auto -m $MODEL --format json)
if [[ $MODE == lanjut ]]; then ARGS+=(--session "$(cat $LOG/.sesi)"); fi
if [[ -n ${CMD:-} ]]; then ARGS+=(--command $CMD); fi

cd $WS
print -r -- "$PESAN" > $LOG/$LABEL.pesan.txt
HOME=$ISO XDG_CONFIG_HOME=$ISO/.config perl -e "alarm ${BATAS:-480}; exec @ARGV" opencode run $ARGS "$PESAN" > $LOG/$LABEL.jsonl 2> $LOG/$LABEL.err
SESI=$(grep -o '"sessionID":"[^"]*"' $LOG/$LABEL.jsonl | head -1 | cut -d'"' -f4); [[ -n $SESI ]] && echo $SESI > $LOG/.sesi

{
  echo "# $LABEL"; echo "PESAN GURU: $PESAN"; echo
  python3 -I $DIR/ringkas.py $LOG/$LABEL.jsonl
  echo; echo "--- perubahan berkas di workspace ---"
  git -C $WS status --short --untracked-files=all
} > $LOG/$LABEL.md
cat $LOG/$LABEL.md
