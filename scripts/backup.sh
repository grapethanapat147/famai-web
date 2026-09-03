#!/usr/bin/env bash
# สำรองฐานข้อมูลด้วยมือ — FAM-1136 · แทน backup อัตโนมัติที่มีเฉพาะแพ็ก Supabase Pro
#
# ใช้:   ./scripts/backup.sh
#        ./scripts/backup.sh ~/Dropbox/famai-backup     (เก็บที่อื่น)
#
# ต้องมี:
#   1) pg_dump  →  brew install libpq && brew link --force libpq
#   2) DATABASE_URL ใน .env.local  (Supabase → Connect → ORMs/psql → Connection string
#      แล้วแทน [YOUR-PASSWORD] ด้วยรหัสฐานข้อมูล)
#
# ไฟล์ที่ได้กู้คืนด้วย:  psql "$DATABASE_URL" -f famai-YYYY-MM-DD.sql
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="${1:-$HOME/famai-backup}"

if [ -f .env.local ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ไม่พบ DATABASE_URL — เติมใน .env.local ก่อน (ดูหัวไฟล์นี้)" >&2
  exit 1
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ ไม่พบ pg_dump — ติดตั้งด้วย:  brew install libpq && brew link --force libpq" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y-%m-%d-%H%M)"
FILE="$OUT_DIR/famai-$STAMP.sql.gz"

echo "กำลังสำรอง → $FILE"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "✅ เสร็จ · ขนาด $SIZE"
echo
echo "⚠️  ก๊อปไฟล์นี้ออกนอกเครื่องด้วย (Google Drive / iCloud / ฮาร์ดดิสก์)"
echo "    เก็บไว้ในเครื่องอย่างเดียว = เครื่องพังก็หายพร้อมกัน"
echo
echo "ไฟล์สำรองที่มีอยู่:"
ls -lhtr "$OUT_DIR" | tail -6
