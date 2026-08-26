#!/bin/sh
# Rebuild styles.css from code.css. Run after changing Tailwind classes in the HTML.
set -e
TW=".tailwindcss"
[ -f "$TW" ] || {
  echo "downloading tailwindcss cli..."
  case "$(uname -m)" in
    arm64) A=macos-arm64 ;;
    *)     A=macos-x64 ;;
  esac
  curl -sL -o "$TW" "https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-$A"
  chmod +x "$TW"
}
./"$TW" -i code.css -o styles.css --minify
echo "styles.css rebuilt ($(wc -c < styles.css) bytes)"
