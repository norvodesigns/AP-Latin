#!/bin/sh
# Makes Lectio's Android upload key, and prints what goes into the GitHub secrets.
#
#   scripts/android-keystore.sh [output-dir]
#
# Play App Signing keeps the real app-signing key; this is only the key you sign
# uploads with, and Google can reset it if it is ever lost. Keep the .jks and the
# passwords somewhere safe anyway (a password manager), and never commit them
# (android/.gitignore already excludes *.jks).
set -eu

dir="${1:-$HOME/lectio-android-upload-key}"
mkdir -p "$dir"
jks="$dir/lectio-upload.jks"
alias="lectio-upload"

if [ -f "$jks" ]; then
  echo "$jks already exists; not overwriting it." >&2
  exit 1
fi

# One password for the store and the key: simpler to keep, and PKCS12 wants them to match.
password="$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 28)"

keytool -genkeypair -v \
  -keystore "$jks" -storetype PKCS12 \
  -alias "$alias" -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$password" -keypass "$password" \
  -dname "CN=Lectio, O=Norvo Designs, C=US"

chmod 600 "$jks"
echo
echo "Created $jks"
echo
echo "Add these as repository secrets (GitHub -> Settings -> Secrets and variables -> Actions):"
echo
echo "  ANDROID_KEYSTORE_PASSWORD = $password"
echo "  ANDROID_KEY_PASSWORD      = $password"
echo "  ANDROID_KEY_ALIAS         = $alias"
echo "  ANDROID_KEYSTORE_BASE64   = (the contents of $dir/lectio-upload.jks.base64)"
base64 < "$jks" | tr -d '\n' > "$jks.base64"
echo
echo "The SHA-256 of the certificate, for the Play Console's upload-key field:"
keytool -list -v -keystore "$jks" -storepass "$password" -alias "$alias" | grep 'SHA256:'
