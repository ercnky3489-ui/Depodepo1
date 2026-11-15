#!/usr/bin/env bash
# Web sürümünü GitHub Pages için docs/ klasörüne derler.
# Kullanım: EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=... tools/build-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${EXPO_PUBLIC_SUPABASE_URL:?Supabase proje adresi gerekli}"
: "${EXPO_PUBLIC_SUPABASE_ANON_KEY:?Supabase anon anahtarı gerekli}"
export EXPO_BASE_URL="${EXPO_BASE_URL:-/Depodepo1}"
rm -rf docs
# .env (yerel geliştirme değerleri) bu derlemeye karışmasın
EXPO_NO_DOTENV=1 CI=1 npx expo export --platform web --output-dir docs --clear
cp docs/index.html docs/404.html   # Pages'te /media/... gibi adresler yenilenince uygulama açılsın
touch docs/.nojekyll                # _expo/ klasörü Jekyll tarafından atlanmasın
echo "Hazır: docs/ ($EXPO_BASE_URL)"
