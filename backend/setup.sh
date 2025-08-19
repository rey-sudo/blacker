#!/bin/bash

# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update



wget -O docker-desktop-amd64.deb "https://desktop.docker.com/linux/main/amd64/docker-desktop-amd64.deb?utm_source=docker&utm_medium=webreferral&utm_campaign=docs-driven-download-linux-amd64&_gl=1*dcrwf5*_gcl_au*MTQ5NTg3Mzc5Ni4xNzQxNjY0MTYx*_ga*MjAxNjgzNzY4Ni4xNzQxNjY0MTYy*_ga_XJWPQMJYHQ*MTc0MTY2NDE2MS4xLjEuMTc0MTY2NDI0My42MC4wLjA."

sudo dpkg -i ./docker-desktop-amd64.deb

sudo apt --fix-broken install

curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube_latest_amd64.deb

sudo dpkg -i minikube_latest_amd64.deb

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"

echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check

sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && \
sudo install skaffold /usr/local/bin/

minikube start --memory=10000 --cpus=6 --disk-size=50g

wget -O k9s_linux_amd64.deb https://github.com/derailed/k9s/releases/download/v0.40.7/k9s_linux_amd64.deb

sudo dpkg -i k9s_linux_amd64.deb

minikube addons enable ingress
minikube addons enable dashboard
minikube addons enable metrics-server