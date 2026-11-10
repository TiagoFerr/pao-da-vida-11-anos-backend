#!/bin/sh
set -e

echo "=========================================================="
echo "  PAO DA VIDA - 120 CULTOS NOS LARES (API BACKEND)"
echo "  11 Anos • Crescer & Edificar • Efésios 4:16"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "--> Sincronizando schema com o PostgreSQL (Prisma db push)..."
  npx prisma db push --skip-generate || echo "Aviso: Nao foi possivel sincronizar schema imediatamente."

  echo "--> Aplicando seed territorial idempotente..."
  if [ -f "dist/prisma/seed.js" ]; then
    node dist/prisma/seed.js || echo "Aviso: Seed concluido ou ignorado."
  else
    npx prisma db seed || echo "Aviso: Seed concluido ou ignorado."
  fi
fi

echo "--> Iniciando aplicacao NestJS..."
exec "$@"
