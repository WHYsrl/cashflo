#!/bin/bash
# Setup Git e push su GitHub per Supplier CashFlow
# Esegui con: bash setup-git.sh

cd "$(dirname "$0")"

echo "🔧 Inizializzazione Git..."
rm -rf .git
git init
git branch -M main

echo "📦 Staging file..."
git add -A

echo "📋 File in staging:"
git status --short

echo ""
echo "✅ Commit..."
git config user.email "f.bonifati@justwhy.it"
git config user.name "Filippo Bonifati"
git commit -m "Initial commit: Supplier CashFlow app

- Node.js + Express backend with Prisma ORM
- React SPA frontend (Vite)
- PostgreSQL schema: Supplier, Cost, Payment, Document
- Scadenzario with day/week/month/calendar views
- WhatsApp text generator for bank transfers
- Claude AI integration for invoice/quote parsing
- Seed data from AFHU26 Rome event Excel
- Render.com deploy configuration (render.yaml)"

echo ""
echo "🚀 Push su GitHub..."
git remote add origin https://github.com/WHYsrl/cashflo.git
git push -u origin main

echo ""
echo "✅ Done! Repo disponibile su https://github.com/WHYsrl/cashflo"
