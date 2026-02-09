#!/bin/bash

# =============================================================================
# Beshy Whisper - Podman Setup Script for VPS
# =============================================================================
# This script installs Podman and podman-compose on Debian/Ubuntu servers
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION_ID=$VERSION_ID
else
    log_error "Cannot detect OS"
    exit 1
fi

log_info "Detected OS: $OS $VERSION_ID"

# Install Podman
install_podman_debian() {
    log_info "Installing Podman on Debian/Ubuntu..."

    # Update package list
    apt-get update

    # Install prerequisites
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        software-properties-common

    # Install Podman
    apt-get install -y podman

    log_success "Podman installed"
}

install_podman_fedora() {
    log_info "Installing Podman on Fedora/RHEL..."
    dnf install -y podman
    log_success "Podman installed"
}

# Install podman-compose
install_podman_compose() {
    log_info "Installing podman-compose..."

    # Check if pip is available
    if ! command -v pip3 &> /dev/null; then
        log_info "Installing pip3..."
        if [ "$OS" = "debian" ] || [ "$OS" = "ubuntu" ]; then
            apt-get install -y python3-pip
        elif [ "$OS" = "fedora" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
            dnf install -y python3-pip
        fi
    fi

    # Install podman-compose via pip
    pip3 install podman-compose

    log_success "podman-compose installed"
}

# Configure for rootless operation
configure_rootless() {
    log_info "Configuring rootless Podman for user: $SUDO_USER"

    # Enable lingering for the user (allows user services to run when not logged in)
    if [ -n "$SUDO_USER" ]; then
        loginctl enable-linger "$SUDO_USER"
        log_success "Enabled lingering for $SUDO_USER"
    fi

    # Configure subuid/subgid for rootless containers
    if [ -n "$SUDO_USER" ]; then
        if ! grep -q "^$SUDO_USER:" /etc/subuid; then
            echo "$SUDO_USER:100000:65536" >> /etc/subuid
            echo "$SUDO_USER:100000:65536" >> /etc/subgid
            log_success "Configured subuid/subgid for $SUDO_USER"
        fi
    fi
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."

    echo ""
    log_info "Podman version:"
    podman --version

    echo ""
    log_info "podman-compose version:"
    podman-compose --version || log_warning "podman-compose not found in PATH"

    echo ""
    log_info "Testing Podman..."
    podman run --rm hello-world || log_warning "Podman test failed"

    echo ""
    log_success "Installation complete!"
}

# Main installation
main() {
    log_info "Starting Podman setup..."

    case "$OS" in
        debian|ubuntu)
            install_podman_debian
            ;;
        fedora|rhel|centos)
            install_podman_fedora
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    install_podman_compose
    configure_rootless
    verify_installation

    echo ""
    echo "============================================="
    echo "Next steps:"
    echo "============================================="
    echo "1. Copy .env.container.example to .env.container"
    echo "2. Edit .env.container with your production values"
    echo "3. Run: ./scripts/deploy-podman.sh build"
    echo "4. Run: ./scripts/deploy-podman.sh up"
    echo "5. Verify: ./scripts/deploy-podman.sh status"
    echo ""
}

main "$@"
