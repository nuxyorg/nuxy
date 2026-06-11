#!/usr/bin/env bash
# Nuxy installer
# Usage: curl -fsSL https://raw.githubusercontent.com/nuxy/nuxy/main/install.sh | bash
#        NUXY_INSTALL_DIR=/opt/nuxy bash install.sh

set -euo pipefail

REPO="nuxy/nuxy"
INSTALL_DIR="${NUXY_INSTALL_DIR:-$HOME/.local/share/nuxy}"
DESKTOP_DIR="$HOME/.local/share/applications"
BIN_DIR="$HOME/.local/bin"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64)         ARCH_LABEL="x64";   DEB_ARCH="amd64"; APPIMAGE_ARCH="x86_64" ;;
  aarch64 | arm64) ARCH_LABEL="arm64"; DEB_ARCH="arm64"; APPIMAGE_ARCH="arm64"   ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# ── helpers ──────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 1; }

require() { command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed."; }

download() {
  local url="$1" dest="$2"
  echo "  → $(basename "$dest")"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --progress-bar -o "$dest" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget --show-progress -qO "$dest" "$url"
  else
    die "curl or wget is required."
  fi
}

fetch_latest_version() {
  local api="https://api.github.com/repos/${REPO}/releases/latest"
  if command -v curl >/dev/null 2>&1; then
    curl -sfL "$api" | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/'
  else
    wget -qO- "$api" | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/'
  fi
}

release_url() {
  echo "https://github.com/${REPO}/releases/download/v${VERSION}/$1"
}

# ── .desktop + wrapper ───────────────────────────────────────────────────────

write_wrapper() {
  local exec_cmd="$1"
  mkdir -p "$INSTALL_DIR"
  cat > "${INSTALL_DIR}/nuxy.sh" <<SCRIPT
#!/usr/bin/env bash
SOCKET="/tmp/nuxy.sock"

send_command() {
  node -e "
  const net = require('net');
  const client = net.connect('\${SOCKET}', () => {
    client.write('\$1');
    client.end();
  });
  client.on('error', () => process.exit(1));
  " 2>/dev/null
}

if [ "\${1:-}" = "toggle" ]; then
  [ -S "\$SOCKET" ] && send_command "toggle" || echo "Nuxy is not running."
else
  if [ -S "\$SOCKET" ]; then
    send_command "show"
  else
    ${exec_cmd} &
  fi
fi
SCRIPT
  chmod +x "${INSTALL_DIR}/nuxy.sh"
  mkdir -p "$BIN_DIR"
  ln -sf "${INSTALL_DIR}/nuxy.sh" "${BIN_DIR}/nuxy"
}

write_desktop_entry() {
  local exec_path="$1"
  mkdir -p "$DESKTOP_DIR"
  cat > "${DESKTOP_DIR}/nuxy.desktop" <<DESKTOP
[Desktop Entry]
Name=Nuxy
Comment=Nuxy Spotlight Launcher
Exec=${exec_path}
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Utility;
Keywords=launcher;spotlight;search;
StartupNotify=false
StartupWMClass=nuxy
DESKTOP
  command -v update-desktop-database >/dev/null 2>&1 \
    && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
}

# ── Linux installers ─────────────────────────────────────────────────────────

install_appimage() {
  local url
  url="$(release_url "Nuxy-${VERSION}-${APPIMAGE_ARCH}.AppImage")"
  local dest="${INSTALL_DIR}/Nuxy.AppImage"

  mkdir -p "$INSTALL_DIR"
  download "$url" "$dest"
  chmod +x "$dest"

  write_wrapper "${INSTALL_DIR}/Nuxy.AppImage"
  write_desktop_entry "${INSTALL_DIR}/nuxy.sh"

  echo ""
  echo "Installed to:   ${INSTALL_DIR}"
  echo "Desktop entry:  ${DESKTOP_DIR}/nuxy.desktop"
  echo "CLI:            ${BIN_DIR}/nuxy"
}

install_deb() {
  local url
  url="$(release_url "nuxy_${VERSION}_${DEB_ARCH}.deb")"
  local tmp; tmp="$(mktemp /tmp/nuxy-XXXXXX.deb)"

  download "$url" "$tmp"

  if command -v apt >/dev/null 2>&1; then
    sudo apt install -y "$tmp"
  elif command -v dpkg >/dev/null 2>&1; then
    sudo dpkg -i "$tmp"
    sudo apt-get install -f -y 2>/dev/null || true
  fi
  rm -f "$tmp"

  echo ""
  echo "Installed via .deb — desktop entry created by the package."
}

install_linux() {
  # Arch / pacman
  if command -v pacman >/dev/null 2>&1; then
    echo ""
    echo "Arch Linux detected."
    echo ""
    echo "Option 1 — AUR (recommended):"
    echo "  yay -S nuxy-bin"
    echo "  paru -S nuxy-bin"
    echo ""
    printf "Option 2 — AppImage fallback [y/N]: "
    read -r reply
    [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    install_appimage
    return
  fi

  # Debian / Ubuntu
  if command -v apt >/dev/null 2>&1 || command -v dpkg >/dev/null 2>&1; then
    install_deb
    return
  fi

  # Fedora / RHEL / openSUSE — no rpm package yet, use AppImage
  install_appimage
}

# ── macOS installer ──────────────────────────────────────────────────────────

install_macos() {
  require hdiutil

  local url; url="$(release_url "Nuxy-${VERSION}.dmg")"
  local tmp; tmp="$(mktemp /tmp/nuxy-XXXXXX.dmg)"

  download "$url" "$tmp"

  local mount_point; mount_point="$(mktemp -d /tmp/nuxy-mount-XXXXXX)"
  hdiutil attach -quiet -mountpoint "$mount_point" "$tmp"

  echo "Copying Nuxy.app to /Applications..."
  cp -R "${mount_point}/Nuxy.app" /Applications/

  hdiutil detach -quiet "$mount_point"
  rm -f "$tmp"

  echo ""
  echo "Installed to:  /Applications/Nuxy.app"
  echo "Launch:        open /Applications/Nuxy.app"
}

# ── entry point ──────────────────────────────────────────────────────────────

VERSION="${VERSION:-$(fetch_latest_version)}"
[ -n "$VERSION" ] || die "Could not determine latest version. Set VERSION= to override."

echo ""
echo "Installing Nuxy ${VERSION}..."
echo ""

case "$OS" in
  linux)  install_linux  ;;
  darwin) install_macos  ;;
  *)      die "Unsupported OS: $OS. For Windows, download the installer from https://github.com/${REPO}/releases." ;;
esac

echo ""
echo "Nuxy ${VERSION} ready."
echo ""
echo "Global hotkey setup:"
if [ "$OS" = "darwin" ]; then
  echo "  Use Automator or Hammerspoon to bind a key to:"
  echo "    echo toggle | nc -U /tmp/nuxy.sock"
else
  echo "  Bind a shortcut in your DE settings to: nuxy toggle"
  echo "  Or (full path): ${INSTALL_DIR}/nuxy.sh toggle"
fi
echo ""
