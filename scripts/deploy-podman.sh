#!/bin/bash

# =============================================================================
# Beshy Whisper - Podman Deployment Script
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Container names
APP_CONTAINER="beshy-whisper"
REDIS_CONTAINER="beshy-redis"

# Helper functions
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

# Check if podman-compose is available, fall back to podman compose
get_compose_command() {
    if command -v podman-compose &> /dev/null; then
        echo "podman-compose"
    elif podman compose version &> /dev/null 2>&1; then
        echo "podman compose"
    else
        log_error "Neither podman-compose nor 'podman compose' found. Please install one."
        exit 1
    fi
}

COMPOSE_CMD=$(get_compose_command)

# Commands
cmd_build() {
    log_info "Building containers..."
    cd "$PROJECT_DIR"

    # Build with Sentry args if available
    if [ -n "$SENTRY_AUTH_TOKEN" ]; then
        $COMPOSE_CMD build --build-arg SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" \
            --build-arg SENTRY_ORG="$SENTRY_ORG" \
            --build-arg SENTRY_PROJECT="$SENTRY_PROJECT"
    else
        $COMPOSE_CMD build
    fi

    log_success "Build completed"
}

cmd_up() {
    log_info "Starting containers..."
    cd "$PROJECT_DIR"
    $COMPOSE_CMD up -d
    log_success "Containers started"

    log_info "Waiting for health checks..."
    sleep 5
    cmd_status
}

cmd_down() {
    log_info "Stopping containers..."
    cd "$PROJECT_DIR"
    $COMPOSE_CMD down
    log_success "Containers stopped"
}

cmd_restart() {
    log_info "Restarting containers..."
    cmd_down
    cmd_up
}

cmd_logs() {
    cd "$PROJECT_DIR"
    if [ -n "$2" ]; then
        $COMPOSE_CMD logs -f "$2"
    else
        $COMPOSE_CMD logs -f
    fi
}

cmd_status() {
    log_info "Container status:"
    podman ps -a --filter "name=beshy" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    log_info "Health check:"

    # Check app health
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:4000/api/health)
        log_success "App is healthy"
        echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
    else
        log_warning "App health check failed"
    fi

    # Check Redis
    if podman exec $REDIS_CONTAINER redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is responding"
    else
        log_warning "Redis check failed"
    fi
}

cmd_shell() {
    container="${2:-$APP_CONTAINER}"
    log_info "Opening shell in $container..."
    podman exec -it "$container" /bin/sh
}

cmd_redis_cli() {
    log_info "Connecting to Redis CLI..."
    podman exec -it $REDIS_CONTAINER redis-cli
}

cmd_clean() {
    log_warning "This will remove all beshy containers, images, and volumes."
    read -p "Are you sure? (y/N): " confirm

    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        log_info "Stopping containers..."
        cd "$PROJECT_DIR"
        $COMPOSE_CMD down -v --rmi local

        log_info "Removing dangling images..."
        podman image prune -f

        log_success "Cleanup completed"
    else
        log_info "Cancelled"
    fi
}

cmd_pull() {
    log_info "Pulling latest changes..."
    cd "$PROJECT_DIR"
    git pull
    log_success "Pull completed"
}

cmd_deploy() {
    log_info "Starting full deployment..."
    cmd_pull
    cmd_build
    cmd_down
    cmd_up
    log_success "Deployment completed"
}

cmd_rollback() {
    log_warning "Rolling back to PM2..."
    cmd_down

    cd "$PROJECT_DIR"
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js
        log_success "Rolled back to PM2"
    else
        log_error "PM2 not found. Please start the application manually."
        exit 1
    fi
}

cmd_help() {
    echo "Beshy Whisper - Podman Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build       Build container images"
    echo "  up          Start all containers"
    echo "  down        Stop all containers"
    echo "  restart     Restart all containers"
    echo "  logs [svc]  Show container logs (optionally for specific service)"
    echo "  status      Show container status and health"
    echo "  shell [svc] Open shell in container (default: app)"
    echo "  redis-cli   Connect to Redis CLI"
    echo "  clean       Remove all containers, images, and volumes"
    echo "  pull        Pull latest changes from git"
    echo "  deploy      Full deployment (pull + build + restart)"
    echo "  rollback    Stop Podman and start PM2"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy              # Full deployment"
    echo "  $0 logs app            # Show app logs"
    echo "  $0 shell               # Shell into app container"
    echo "  $0 redis-cli           # Redis CLI"
}

# Main
case "${1:-help}" in
    build)
        cmd_build
        ;;
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs "$@"
        ;;
    status)
        cmd_status
        ;;
    shell)
        cmd_shell "$@"
        ;;
    redis-cli)
        cmd_redis_cli
        ;;
    clean)
        cmd_clean
        ;;
    pull)
        cmd_pull
        ;;
    deploy)
        cmd_deploy
        ;;
    rollback)
        cmd_rollback
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        cmd_help
        exit 1
        ;;
esac
