# Podman Setup Guide

Podman is a daemonless container engine that's fully compatible with Docker but more secure and doesn't require root privileges.

## Why Podman?

✅ **No daemon** - More secure, no background service
✅ **Rootless** - Runs without root privileges
✅ **Docker compatible** - Same CLI commands
✅ **Faster** - Better resource usage
✅ **Open source** - Truly free and open

## Installation

### macOS

```bash
# Install via Homebrew
brew install podman

# Initialize Podman machine
podman machine init

# Start Podman machine
podman machine start

# Verify installation
podman --version
podman ps
```

### Linux (Ubuntu/Debian)

```bash
# Install Podman
sudo apt-get update
sudo apt-get install -y podman

# Verify
podman --version
```

### Linux (RHEL/CentOS/Fedora)

```bash
# Install Podman
sudo yum install -y podman

# Verify
podman --version
```

## Quick Start

### Build Lambda Functions

```bash
cd lambda

# This automatically uses Podman if available
./deploy.sh

# Or use the dedicated container build script
./build-docker.sh  # Works with Podman too!
```

### Common Commands

```bash
# Run a container (just like Docker)
podman run -it --rm ubuntu:latest bash

# List running containers
podman ps

# List all containers
podman ps -a

# Remove all stopped containers
podman container prune

# List images
podman images

# Remove unused images
podman image prune -a
```

## Podman Machine (macOS)

Podman on macOS runs in a lightweight VM:

```bash
# Start the VM
podman machine start

# Stop the VM
podman machine stop

# Check VM status
podman machine list

# SSH into the VM
podman machine ssh

# Remove the VM
podman machine rm
```

## Configuration

### Set Default Platform

```bash
# For Lambda (x86_64)
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# Add to ~/.zshrc or ~/.bashrc
echo 'export DOCKER_DEFAULT_PLATFORM=linux/amd64' >> ~/.zshrc
```

### Increase Resources (macOS)

```bash
# Stop machine
podman machine stop

# Remove old machine
podman machine rm

# Create with more resources
podman machine init --cpus 4 --memory 4096 --disk-size 50

# Start
podman machine start
```

## Troubleshooting

### Error: "connection refused"

```bash
# Restart Podman machine (macOS)
podman machine stop
podman machine start

# Or restart the service (Linux)
systemctl --user restart podman
```

### Error: "no such file or directory"

```bash
# Initialize Podman machine (macOS)
podman machine init
podman machine start
```

### Error: "permission denied"

```bash
# Run in rootless mode (Linux)
podman system migrate

# Or check if user is in podman group
sudo usermod -aG podman $USER
newgrp podman
```

### Slow builds on macOS

```bash
# Use :z flag for better performance with volumes
podman run -v "$PWD":/var/task:z image-name

# This is already in our scripts!
```

## Docker Compatibility

Podman is fully compatible with Docker commands. You can even alias it:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias docker=podman

# Now all docker commands work!
docker run -it ubuntu
docker ps
docker build -t myimage .
```

## Building Lambda Functions

### Automatic Detection

Our scripts automatically detect and use Podman:

```bash
cd lambda
./deploy.sh  # Uses Podman if available, falls back to Docker
```

### Manual Build

```bash
cd lambda

# Build dependencies in Lambda environment
podman run --rm \
  --platform linux/amd64 \
  -v "$PWD":/var/task:z \
  public.ecr.aws/lambda/python:3.11 \
  pip install -r requirements.txt -t /var/task/package --no-cache-dir

# Package functions
cd auth
zip -r ../auth.zip .
cd ../chat
zip -r ../chat.zip .
cd ../websocket
zip -r ../websocket.zip .
cd ..
```

## Best Practices

### 1. Use Rootless Mode (Linux)

```bash
# Check if running rootless
podman info | grep rootless

# Should show: rootless: true
```

### 2. Clean Up Regularly

```bash
# Remove unused containers
podman container prune -f

# Remove unused images
podman image prune -a -f

# Remove all unused data
podman system prune -a -f --volumes
```

### 3. Use Volume Mounts Correctly

```bash
# Always use :z flag on SELinux systems (Linux)
podman run -v "$PWD":/data:z image-name

# macOS doesn't need :z but it doesn't hurt
podman run -v "$PWD":/data:z image-name
```

### 4. Set Resource Limits

```bash
# Limit memory
podman run --memory="512m" image-name

# Limit CPU
podman run --cpus="1.5" image-name
```

## Comparison: Podman vs Docker

| Feature | Podman | Docker |
|---------|--------|--------|
| **Daemon** | No | Yes |
| **Root required** | No | Yes (usually) |
| **Security** | Better (rootless) | Standard |
| **Resource usage** | Lower | Higher |
| **Kubernetes compatible** | Native | Via Desktop |
| **CLI compatibility** | 100% Docker compatible | - |
| **macOS** | Via VM | Via Desktop |
| **Linux** | Native | Native |

## Performance Tips

### macOS

```bash
# Use more CPU/RAM
podman machine rm
podman machine init --cpus 4 --memory 8192

# Use virtio-fs for faster file sharing
podman machine init --volume-driver virtio-fs
```

### Linux

```bash
# Use overlay2 storage driver
cat > ~/.config/containers/storage.conf << EOF
[storage]
driver = "overlay2"
EOF
```

## Integration with Our Project

### Setup Script

```bash
# Our setup.sh automatically detects Podman
./setup.sh

# It will use Podman if available, otherwise Docker
```

### Deploy Script

```bash
cd lambda

# Automatically uses Podman/Docker
./deploy.sh

# Or force container build
./build-docker.sh
```

### Manual Testing

```bash
# Run Python in Lambda environment
podman run -it --rm \
  -v "$PWD":/var/task:z \
  public.ecr.aws/lambda/python:3.11 \
  python3

# Test function
podman run -it --rm \
  -v "$PWD":/var/task:z \
  public.ecr.aws/lambda/python:3.11 \
  python3 -c "from auth.handler import register; print('OK')"
```

## Uninstall

### macOS

```bash
# Stop and remove machine
podman machine stop
podman machine rm

# Uninstall Podman
brew uninstall podman
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get remove podman

# RHEL/CentOS/Fedora
sudo yum remove podman
```

## Resources

- **Official Docs**: https://podman.io/
- **GitHub**: https://github.com/containers/podman
- **Tutorial**: https://podman.io/getting-started/
- **Migration from Docker**: https://podman.io/docs/docker

## Quick Reference

```bash
# Install (macOS)
brew install podman
podman machine init
podman machine start

# Build Lambda functions
cd lambda && ./deploy.sh

# Deploy to AWS
cd terraform && terraform apply

# Clean up
podman system prune -a -f
```

---

**Podman just works!** It's a drop-in replacement for Docker with better security and performance. 🚀

