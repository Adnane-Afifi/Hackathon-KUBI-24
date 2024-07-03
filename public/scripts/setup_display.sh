#!/bin/bash

# Variables
USER=admin
HOME_DIR=/home/$USER
PROJECT_DIR=$HOME_DIR/project
VENV_DIR=$PROJECT_DIR/venv
SERVICE_FILE=/etc/systemd/system/media_display.service

# Mettre à jour le système
sudo apt-get update && sudo apt-get upgrade -y

# Installer les dépendances nécessaires
sudo apt-get install -y python3 python3-venv python3-pip vlc feh xorg

# Vérifier l'installation des dépendances
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 could not be installed."
    exit 1
fi
if ! command -v vlc &> /dev/null; then
    echo "Error: vlc could not be installed."
    exit 1
fi
if ! command -v feh &> /dev/null; then
    echo "Error: feh could not be installed."
    exit 1
fi

# Créer l'environnement virtuel Python
mkdir -p $PROJECT_DIR
python3 -m venv $VENV_DIR

# Vérifier la création de l'environnement virtuel
if [[ ! -d "$VENV_DIR" ]]; then
    echo "Error: Python virtual environment could not be created."
    exit 1
fi

# Activer l'environnement virtuel et installer les packages Python nécessaires
source $VENV_DIR/bin/activate
pip install Pillow pdf2image

# Vérifier l'installation des packages Python
if ! pip show Pillow &> /dev/null; then
    echo "Error: Pillow could not be installed."
    deactivate
    exit 1
fi
if ! pip show pdf2image &> /dev/null; then
    echo "Error: pdf2image could not be installed."
    deactivate
    exit 1
fi

# Désactiver l'environnement virtuel
deactivate

# Assurer que les fichiers player.py et run_player.sh existent
if [[ ! -f "$PROJECT_DIR/player.py" ]]; then
    echo "Error: player.py not found in $PROJECT_DIR"
    exit 1
fi

if [[ ! -f "$HOME_DIR/display_media.sh" ]]; then
    echo "Error: run_player.sh not found in $HOME_DIR"
    exit 1
fi

# Rendre le script run_player.sh exécutable
sudo chmod +x $HOME_DIR/display_media.sh

# Créer le fichier de service systemd
sudo bash -c "cat << 'EOF' > $SERVICE_FILE
[Unit]
Description=Media Display Service
After=network.target

[Service]
ExecStart=/home/admin/display_media.sh
WorkingDirectory=/home/admin
Restart=always
RestartSec=10
User=admin
Environment='DISPLAY=:0'
Environment='XAUTHORITY=/home/admin/.Xauthority'

[Install]
WantedBy=multi-user.target
EOF"

# Recharger systemd et activer le service
sudo systemctl daemon-reload
sudo systemctl enable media_display.service
sudo systemctl start media_display.service

# Vérifier que le service systemd est en cours d'exécution
if ! systemctl is-active --quiet media_display.service; then
    echo "Error: media_display.service could not be started."
    exit 1
fi

# Fin du script
echo "Configuration complète. Redémarrage du système pour finaliser la configuration."
sudo reboot

