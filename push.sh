#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Début du script de push...${NC}"

# Ajouter tous les fichiers
echo -e "${YELLOW}📦 Ajout des fichiers...${NC}"
git add .

# Vérifier s'il y a des changements à commiter
if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠️  Aucun changement à commiter${NC}"
  exit 0
fi

# Créer le message de commit avec timestamp
commit_message="commit $(date '+%Y-%m-%d %H:%M:%S')"

# Faire le commit
echo -e "${YELLOW}✏️  Commit: $commit_message${NC}"
git commit -m "$commit_message"

# Pousser vers origin main
echo -e "${YELLOW}☁️  Push vers origin main...${NC}"
git push origin main

# Vérifier le résultat
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Push réussi: $commit_message${NC}"
else
  echo -e "${RED}❌ Échec du push${NC}"
  exit 1
fi