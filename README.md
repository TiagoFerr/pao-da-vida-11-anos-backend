# 🍞 Pão da Vida - 120 Cultos nos Lares (11 Anos)

[![CI Pipeline](https://github.com/TiagoFerr/pao-da-vida-11-anos/actions/workflows/ci.yml/badge.svg)](https://github.com/TiagoFerr/pao-da-vida-11-anos/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-v22-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/Framework-NestJS-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Cache%20%26%20Events-Redis%207-darkred.svg)](https://redis.io/)
[![MinIO S3](https://img.shields.io/badge/Storage-MinIO%20S3-orange.svg)](https://min.io/)

Sistema de gestão territorial, acompanhamento em tempo real e consolidação de membros para o evento comemorativo de **11 Anos da Igreja Pão da Vida** em Mossoró - RN.

> *"Crescer & Edificar"* — **Efésios 4:16**  
> **Data do Evento:** 19 de Novembro de 2026  
> **Meta Estratégica:** 120 cultos simultâneos em residências distribuídas pelos 14 setores pastorais da cidade.

---

## 🏛️ Arquitetura & Engenharia de Software

O projeto adota os princípios de **Clean Architecture & Domain-Driven Design (DDD)** em Node.js com TypeScript, projetado para alta escalabilidade, desacoplamento e deploy direto em VPS.

* 📄 **[Blueprint Completo de Arquitetura (ARQUITETURA_DO_SISTEMA.md)](./ARQUITETURA_DO_SISTEMA.md)**
* 📄 **[Análise e Modelagem Territorial Inicial (ANALISE_E_MODELAGEM_PROJETO.md)](./ANALISE_E_MODELAGEM_PROJETO.md)**

### Pilares da Arquitetura:
1. **Banco Relacional Puro (PostgreSQL 16):** Modelagem com integridade referencial estrita e campo `setor` (1 a 14) explícito.
2. **Streaming em Tempo Real (SSE):** Server-Sent Events segmentados para Pastores (feed macro da cidade) e Coordenadores (feed regional do seu setor).
3. **IAM & Segurança:** Autenticação por e-mail/senha com hash Argon2id, tokens JWT de vida curta com rotação de Refresh Token no Redis e RBAC granular.
4. **Onboarding Descentralizado via WhatsApp:** Convites nominalmente atrelados a setores com tokens criptográficos descartáveis de uso único.
5. **Mídia Descentralizada (MinIO S3):** Upload de fotos dos lares direto do dispositivo móvel para o MinIO via *Presigned URLs* com curadoria para projeção no telão da igreja.
6. **Pipeline de CI/CD (GitHub Actions):** Testes e validações automatizadas em Pull Requests e entrega contínua na VPS a cada merge na branch `main`.

---

## 📂 Estrutura do Repositório

```
pao-da-vida-11-anos/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Integração Contínua (Lint, TypeCheck, Testes, Build)
│       └── cd.yml                 # Deploy Contínuo na VPS via SSH
│
├── backend/                       # API REST Modular NestJS
│   ├── src/                       # Clean Architecture (Core, Application, Infra, Presentation)
│   ├── prisma/                    # Schema PostgreSQL e Migrations
│   ├── test/                      # Testes Unitários e de Integração
│   ├── Dockerfile                 # Imagem multi-stage de produção
│   └── docker-compose.yml         # Ambiente local (Postgres 16 + Redis 7)
│
├── frontend/                      # Aplicação Web dos Cultos no Lar
├── legacy/                        # Protótipos e referências iniciais
├── ARQUITETURA_DO_SISTEMA.md      # Especificação arquitetural de referência
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* Node.js v22+
* Docker & Docker Compose

### 1. Clonar o Repositório
```bash
git clone https://github.com/TiagoFerr/pao-da-vida-11-anos.git
cd pao-da-vida-11-anos
```

### 2. Subir os Serviços Locais (PostgreSQL + Redis)
```bash
cd backend
docker compose up -d
```

### 3. Instalar Dependências e Rodar Migrations
```bash
npm install
npx prisma migrate dev
npm run start:dev
```

---

## 👥 Papéis do Sistema (RBAC)

* **PASTOR / ADMIN:** Gestão global, telão do evento via SSE, relatórios de conversões e administração de contas.
* **COORDENADOR_SETOR:** Gestor de um dos 14 setores pastorais, validação dos lares e acompanhamento ao vivo do seu setor.
* **LIDER_CULTO:** Membro dirigente do culto no lar, responsável pelo check-in de participantes e registro de decisões por Cristo.
* **ANFITRIAO:** Membro anfitrião que acolhe a igreja em sua residência.
