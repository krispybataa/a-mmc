#!/bin/bash
#Modified: 3/20/26
#Author: Gacho
#Purpose: Setup server for adding SSH users, installing docker, setting firewall

#loop dum1 and dum2 users

for user in dum1 dum2; do
    useradd -m -s /bin/bash $user
    echo "$user:" | chpasswd
    usermod -aG sudo $user
    sudo -u "$user" mkdir -p /home/$user/.ssh
    sudo -u "$user" chmod 700 /home/$user/.ssh
    chown $user:$user /home/$user/.ssh
    sudo -u "$user" touch /home/$user/.ssh/authorized_keys
    sudo -u "$user" chmod 600 /home/$user/.ssh/authorized_keys

    if [[ "$user" == "dum1" ]]; then
        var=""

        echo "$var" >> /home/$user/.ssh/authorized_keys
    else
        var=""
        echo "$var" >> /home/$user/.ssh/authorized_keys
    fi
done

# Update system
apt update && apt upgrade -y

# Install basic utilities
apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
| gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" \
| tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update

apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable docker on boot
systemctl enable docker
systemctl start docker

# Allow ubuntu user to run docker
usermod -aG docker ubuntu

# Firewall allwows ssh, http, and https
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# # Create deployment directory
# mkdir -p /opt/app
# chown ubuntu:ubuntu /opt/app

