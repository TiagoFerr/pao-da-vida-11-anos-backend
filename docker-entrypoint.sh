#!/bin/sh
set -e

echo "=========================================================="
echo "  PAO DA VIDA - 120 CULTOS NOS LARES (API BACKEND)"
echo "  11 Anos • Crescer & Edificar • Efésios 4:16"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "--> Sincronizando schema com o PostgreSQL (Prisma db push)..."
  npx prisma db push --skip-generate || echo "Aviso: Nao foi possivel sincronizar schema imediatamente."

  echo "--> Verificando se os dados iniciais dos setores precisam ser populados..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    async function check() {
      try {
        const count = await prisma.setorPastoral.count();
        if (count === 0) {
          console.log('Nenhum setor encontrado. Populando dados iniciais com Seed...');
          process.exit(10);
        } else {
          console.log('Banco ja inicializado (' + count + ' setores encontrados). Pulando seed.');
          process.exit(0);
        }
      } catch (err) {
        console.log('Aguardando banco ficar pronto...', err.message);
        process.exit(0);
      } finally {
        await prisma.\$disconnect();
      }
    }
    check();
  " || (npx ts-node prisma/seed.ts || echo "Seed concluido ou nao aplicavel.")
fi

echo "--> Iniciando aplicacao NestJS..."
exec "$@"
