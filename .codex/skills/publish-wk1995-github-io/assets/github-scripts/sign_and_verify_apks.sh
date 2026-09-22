#!/usr/bin/env bash

set -euo pipefail

required_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

for name in INPUT_APK_DIR OUTPUT_APK_DIR APP_VERSION ANDROID_KEYSTORE_PATH \
  ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD ANDROID_KEYSTORE_PASSWORD; do
  required_env "$name"
done

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$android_sdk_root" ]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT must be set." >&2
  exit 1
fi
if [ ! -d "$INPUT_APK_DIR" ] || [ ! -s "$ANDROID_KEYSTORE_PATH" ]; then
  echo "APK input directory or signing key is missing." >&2
  exit 1
fi
if [[ ! "$APP_VERSION" =~ ^[A-Za-z0-9][A-Za-z0-9._()+-]*$ ]]; then
  echo "Unsafe app version: $APP_VERSION" >&2
  exit 1
fi

mkdir -p "$OUTPUT_APK_DIR"
mapfile -d '' apk_files < <(find "$INPUT_APK_DIR" -maxdepth 1 -type f -name '*.apk' -print0)
if [ "${#apk_files[@]}" -eq 0 ]; then
  echo "Input artifact contains no APK." >&2
  exit 1
fi

zipalign_path="$(find "$android_sdk_root/build-tools" -type f -name zipalign -print | sort -V | tail -n 1)"
apksigner_path="$(find "$android_sdk_root/build-tools" -type f -name apksigner -print | sort -V | tail -n 1)"
if [ -z "$zipalign_path" ] || [ -z "$apksigner_path" ]; then
  echo "Android zipalign or apksigner tool was not found." >&2
  exit 1
fi

for apk_file in "${apk_files[@]}"; do
  apk_basename="$(basename "$apk_file" .apk)"
  apk_basename="${apk_basename%-unsigned}"
  aligned_apk="${RUNNER_TEMP:-/tmp}/${apk_basename}-aligned.apk"
  signed_apk="$OUTPUT_APK_DIR/${apk_basename}-${APP_VERSION}.apk"
  "$zipalign_path" -f -p 4 "$apk_file" "$aligned_apk"
  "$apksigner_path" sign \
    --ks "$ANDROID_KEYSTORE_PATH" \
    --ks-key-alias "$ANDROID_KEY_ALIAS" \
    --ks-pass env:ANDROID_KEYSTORE_PASSWORD \
    --key-pass env:ANDROID_KEY_PASSWORD \
    --out "$signed_apk" \
    "$aligned_apk"
  "$apksigner_path" verify --verbose --print-certs "$signed_apk"
done
