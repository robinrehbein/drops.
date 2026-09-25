#!/usr/bin/env bash
# Creates the Android upload key for Play and stores it as GitHub Actions secrets
# for .github/workflows/android-release.yml. Run it on your own machine, so the
# private key never leaves it.
#
#   scripts/android-upload-key.sh                      # create a new upload key
#   scripts/android-upload-key.sh path/to/key.jks ALIAS  # use an existing keystore (e.g. from EAS)
#
# Needs: keytool (comes with any JDK), openssl, base64. With the GitHub CLI (gh)
# logged in, the secrets are set automatically; otherwise the values are printed.
set -euo pipefail

ENVIRONMENT="production"   # GitHub environment the release workflow uses
OUT_DIR="${HOME}/.drops-signing"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

if [[ $# -ge 2 ]]; then
  KEYSTORE="$1"
  ALIAS="$2"
  read -r -s -p "Keystore password: " STORE_PASS; echo
  read -r -s -p "Key password (Enter = same as keystore): " KEY_PASS; echo
  KEY_PASS="${KEY_PASS:-$STORE_PASS}"
else
  KEYSTORE="$OUT_DIR/drops-upload.jks"
  ALIAS="drops-upload"
  if [[ -e "$KEYSTORE" ]]; then
    echo "$KEYSTORE already exists. Delete it first or pass it as an argument." >&2
    exit 1
  fi
  # PKCS12 keystores use one password for store and key.
  STORE_PASS="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
  KEY_PASS="$STORE_PASS"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" -storetype PKCS12 \
    -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000 \
    -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
    -dname "CN=drops., O=drops., C=DE" >/dev/null
  chmod 600 "$KEYSTORE"
  # Keep the password next to the key; both belong in your password manager.
  printf 'alias=%s\npassword=%s\n' "$ALIAS" "$STORE_PASS" > "$OUT_DIR/drops-upload.txt"
  chmod 600 "$OUT_DIR/drops-upload.txt"
  echo "Created $KEYSTORE (password in $OUT_DIR/drops-upload.txt)."
fi

B64="$(base64 < "$KEYSTORE" | tr -d '\n')"
SHA256="$(keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "$STORE_PASS" | awk '/SHA256:/ {print $2; exit}')"

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh secret set ANDROID_KEYSTORE_BASE64   --env "$ENVIRONMENT" --body "$B64"
  gh secret set ANDROID_KEYSTORE_PASSWORD --env "$ENVIRONMENT" --body "$STORE_PASS"
  gh secret set ANDROID_KEY_ALIAS         --env "$ENVIRONMENT" --body "$ALIAS"
  gh secret set ANDROID_KEY_PASSWORD      --env "$ENVIRONMENT" --body "$KEY_PASS"
  echo "Set the four ANDROID_* secrets in the GitHub environment '$ENVIRONMENT'."
else
  B64_FILE="$OUT_DIR/keystore.base64.txt"
  printf '%s' "$B64" > "$B64_FILE"
  chmod 600 "$B64_FILE"
  cat <<EOF
GitHub CLI not available. Add these in GitHub → Settings → Environments → $ENVIRONMENT → Secrets:
  ANDROID_KEYSTORE_BASE64    contents of $B64_FILE
  ANDROID_KEYSTORE_PASSWORD  $STORE_PASS
  ANDROID_KEY_ALIAS          $ALIAS
  ANDROID_KEY_PASSWORD       $KEY_PASS
EOF
fi

echo
echo "Upload key SHA-256: $SHA256"
echo "Back up $KEYSTORE and its password (password manager). Play App Signing"
echo "can reset a lost upload key, but that takes a support request and a few days."
