# Análise Detalhada, Validação Técnica e Baseline de Modelagem
## Projeto: Cultos nos Lares – Igreja Pão da Vida (11 Anos)

---

### Sumário Executivo
Este documento consolida a engenharia reversa completa, a análise crítica de regras de negócio, a validação de UI/UX/estilização e o levantamento de requisitos com base nos arquivos de protótipo fornecidos:
1. `Mapa dos cultos nos lares – Pão da Vida 11 anos (Copy) (Copy).html` (Protótipo executável com GIS SVG vetorial, lógica de estado e formulários)
2. `Mapa dos cultos nos lares – Pão da Vida 11 anos (Copy) (Copy).md` (Documento de cabeçalho e especificações sumárias)

O objetivo principal é servir como a **pedra fundamental para a concepção de uma arquitetura de backend rica**, orientada ao domínio (DDD), desacoplada, escalável e segura para produção em ambiente real.

---

## 1. Visão Geral do Produto e Contexto de Negócio

### 1.1. Propósito e Evento
* **Instituição:** Igreja Pão da Vida (Mossoró - RN).
* **Marco Comemorativo:** Aniversário de 11 Anos da Igreja.
* **Data do Evento:** 19 de Novembro de 2026.
* **Lema Bíblico:** *"Crescer & Edificar, Efésios 4:16"*.
* **Meta Estratégica:** **120 cultos simultâneos nos lares** distribuídos estrategicamente por toda a malha urbana de Mossoró.

### 1.2. Atores e Papéis do Domínio
* **Coordenação Geral / Pastor Sênior (ex: Pastor Gabriel):** Administrador geral, define coordenadores, tem poder de concessão de permissões de colaboradores, visualização de métricas globais e auditoria.
* **Coordenador de Setor:** Responsável por um dos 14 setores geográficos da cidade, supervisiona os bairros sob sua jurisdição, acompanha metas e dá suporte aos líderes.
* **Líder de Culto (Dirigente / Pregador):** Pessoa responsável por ministrar o culto no lar e prestar contas da realização.
* **Anfitrião (Dono da Casa):** Membro ou simpatizante que abre sua residência para sediar a reunião.
* **Participantes / Pessoas Inscritas:** Membros e visitantes que estarão presentes naquele endereço específico.
* **Colaborador / Voluntário:** Usuário com permissão para cadastrar e retificar cultos no mapa.
* **Visualizador (Público / Visitante):** Acesso de leitura para consultar horários, endereços e encontrar o culto mais próximo.

---

## 2. Engenharia Reversa dos Arquivos Atuais

### 2.1. Camada Geográfica e Território (Mossoró - RN)
O arquivo HTML contém uma base geográfica embutida com 14 setores pastorais e seus respectivos bairros e coordenadas de centroide:

| Setor | Coordenação Designada | Cor Hex | Bairros Vinculados |
| :---: | :--- | :---: | :--- |
| **1** | Pr. Rúbens Nunes | `#1D4225` | Aeroporto 1 e 2 / Ouro Negro (Macarrão) |
| **2** | Pra. Adriana Karina e Pra. Silvana | `#D4A84B` | Belo Horizonte, Lagoa do Mato |
| **3** | Pedro Cordeiro | `#7A8165` | Sumaré / Alto do Sumaré |
| **4** | Jessy | `#B5651D` | Bom Jesus, Planalto Treze de Maio, Conjunto Liberdade, Alagados |
| **5** | Pb. Adriano Medeiros e Emanuela Larissa | `#2E6B8A` | Abolição, Santa Delmira, Monsenhor Américo |
| **6** | Andrezza e Jezanias | `#8E3B46` | Parque Universitário, Vingt Rosado, Rincão, Pintos |
| **7** | Isaac Moisés | `#4F7942` | Doze Anos, Boa Vista |
| **8** | Isaac Ramalho | `#6A4C93` | Alto de São Manoel, Dom Jaime Câmara, Presidente Costa e Silva |
| **9** | Pr. Hermes | `#C77D3A` | Jardins, Isla Verde, Nova Mossoró, Santa Júlia |
| **10** | Pr. Cristiano e Pr. Magno | `#2F4F4F` | Santo Antônio, Barrocas |
| **11** | Pb. Diego | `#A0522D` | Centro, Ilha de Santa Luzia, Paredões, Bom Jardim |
| **12** | Maycon Maya | `#3B7A57` | Redenção (área antiga) |
| **13** | Gineton Costa | `#9C8A3E` | Cidade Oeste, Itapetinga |
| **14** | Alisson | `#5C6B73` | Nova Betânia, Bela Vista, Bom Pastor, Dix-Sept Rosado |

### 2.2. Modelo de Dados Explícito no Protótipo
Cada registro de culto (`culto`) manipulado no JavaScript possui a seguinte estrutura:

```typescript
interface CultoEntityPrototype {
  id: string;                      // Identificador gerado no Firestore/Claude DB
  setor: number;                   // Número do setor (1 a 14)
  bairro: string;                  // Nome do bairro ou personalizado
  rua: string;                     // Logradouro
  numero?: string;                 // Número da residência
  referencia?: string;             // Ponto de referência
  x: number;                       // Coordenada projetada X no SVG
  y: number;                       // Coordenada projetada Y no SVG
  lider: string;                   // Nome completo do líder
  liderTel?: string;               // Telefone com máscara (DD) 99999-0000
  anfitriao?: string;              // Nome do dono da casa
  anfTel?: string;                 // Telefone do dono da casa
  pessoas: string[];               // Lista ordenada de nomes de participantes
  horario?: string;                // Horário (ex: "19h30")
  obs?: string;                    // Observações de acessibilidade, lotação, etc.
  criadoPor?: string | null;       // ID do usuário criador
  criadoEm: string;                // ISO Date string
  atualizadoEm: string;            // ISO Date string
}
```

### 2.3. Lógicas Algorítmicas & Comportamentais Mapeadas
1. **Conversão de Coordenadas Cartográficas (`toLL`):**
   * Transforma coordenadas relativas do canvas SVG para Latitude e Longitude reais:
     $$\text{lat} = -5.115 - \frac{y}{9000}$$
     $$\text{lng} = \frac{x}{\cos(-5.188^\circ \times \frac{\pi}{180}) \times 9000} - 37.40$$
2. **Resolução Automática de Bairro e Setor (`bairroAt`):**
   * Ao tocar no mapa, o protótipo verifica via `isPointInFill` em qual polígono de bairro o ponto se encontra. Caso caia em intersecções ou fora de limites rígidos, executa uma busca Euclidiana pelo centroide mais próximo.
3. **Snap à Rua mais Próxima (`nearestStreet`):**
   * Percorre os segmentos de vias do OpenStreetMap (`STREETS.ways`), calcula a distância perpendicular e autocompleta o campo `rua` se estiver a menos de 14 unidades de distância.
4. **Dispersão de Colisão de Marcadores (`spread`):**
   * Se múltiplos cultos forem cadastrados no mesmo ponto (ex: mesmo centroide de bairro sem número exato), aplica um deslocamento em espiral radial (`Math.cos(a)*r`, `Math.sin(a)*r`) para evitar sobreposição total dos ícones.
5. **Automações de Deep Links:**
   * Geração de link para o WhatsApp (`wa.me/55...`) higienizando caracteres não numéricos.
   * Links diretos para Google Maps (`google.com/maps/search/?api=1&query=...`) tanto para texto de endereço quanto para coordenadas geográficas exatas (`lat,lng`).
6. **Regras de Exclusão com Confirmação Rápida (`armDelete`):**
   * Padrão "Armed button": primeiro clique altera texto para *"Toque de novo para excluir"*; dispara timer de 4 segundos antes de desarmar, prevenindo exclusões acidentais sem depender de popups bloqueáveis do navegador.
7. **Exportação de Dados:**
   * Geração de arquivo CSV formatado com delimitador `;` e cabeçalho `\ufeff` (UTF-8 com BOM para Excel no Windows).

---

## 3. Validação de Design, Estilização e UI/UX

### 3.1. Design Tokens e Paleta de Cores
* **Identidade Visual:** Clássica, solene e institucional eclesiástica.
* **Cores Principais:**
  * `--accent`: `#1D4225` (Verde Floresta Nobre / Pinheiro) -> No dark mode: `#9CC9A6`.
  * `--gold`: `#B88A2E` (Ouro Eclesiástico) -> No dark mode: `#E2BC6A`.
  * `--danger`: `#A3322B` / `#D7263D` (Terracota avermelhado para alertas e ícones de casa).
  * `--bg`: `#E9EDE6` (Fundo claro suave e orgânico) -> No dark mode: `#0E1711`.
* **Tipografia:**
  * Títulos, números de destaque e versículos bíblicos: `Lora` (Serifada, elegante).
  * Textos operacionais, formulários, botões e labels de ruas: `Poppins` (Sem serifa, geométrica e limpa).
* **Modos de Visualização:** Suporte total e automático a Dark Mode (`prefers-color-scheme: dark`) e seletor manual via atributo `data-theme`.

### 3.2. Estrutura de Layout e Responsividade
* **Desktop (> 980px):** Layout em Grid com 2 colunas:
  * Coluna da esquerda (flexível): Mapa vetorial interativo com controles de zoom, busca de ruas, layers de satélite/landuse e legenda.
  * Coluna da direita (400px fixo): Painel lateral com busca textual, progresso da meta e lista de setores em acordeão.
* **Mobile / Tablets (< 980px):** Coluna única vertical com altura do mapa reduzida para 64vh e painel lateral rolando naturalmente abaixo do mapa.
* **Telas Ultra-estreitas (< 560px):** Formulário modal com grids de 2 colunas colapsando para 1 única coluna.

---

## 4. Diagnóstico Crítico: Fragilidades e Riscos do Protótipo

| Aspecto | Situação no Protótipo | Risco / Problema no Mundo Real |
| :--- | :--- | :--- |
| **Persistência & Backend** | Dependência da API de sandbox do Claude (`claude.use('db')`) | O sistema não roda fora do ambiente Claude; não há banco de dados SQL/NoSQL real, nem API REST/GraphQL. |
| **Segurança & Autenticação** | Verificação simplória `ux.can('data.write')` | Não há login seguro, JWT, refresh tokens, controle de sessão, nem proteção contra CSRF/XSS ou injeção. |
| **Integridade de Dados** | Sem constraints de banco | Telefones não validados no servidor; pessoas são apenas strings soltas; ausência de integridade referencial. |
| **Acoplamento GIS** | Vetores SVG de ~400KB inlined diretamente no HTML | Qualquer atualização de rota ou novo bairro requer editar o arquivo HTML inteiro; alto consumo de memória e parse lento em celulares modestos. |
| **Concorrência** | Sem controle de versão de registro (*Optimistic Lock*) | Se dois coordenadores editarem o mesmo culto simultaneamente, o último sobrescreve o primeiro sem aviso (*race condition*). |
| **Auditoria e Histórico** | Apenas campos estáticos `criadoPor` e `atualizadoEm` | Nenhuma trilha de auditoria para saber quem alterou o quê, quando ou por quê. |

---

## 5. Engenharia de Requisitos para o Sistema Real

### 5.1. Requisitos Funcionais (RF)
* **RF01 - Autenticação & RBAC:** Permitir login por E-mail/Senha com perfis de acesso: `ADMIN`, `COORDENADOR_SETOR`, `LIDER_CULTO`, `COLABORADOR` e `VISITANTE`.
* **RF02 - Gestão de Setores e Bairros:** CRUD de setores, atribuição de pastores coordenadores e delimitação geográfica via GeoJSON.
* **RF03 - Gestão de Cultos nos Lares:** Cadastrar, consultar, atualizar, cancelar e finalizar cultos nos lares.
* **RF04 - Vínculo Territorial e Setor Explícito:** O cadastro de cada culto registra explicitamente o número do setor (1 a 14) e as coordenadas geográficas (latitude e longitude) como valores numéricos padrão, mantendo a integridade com os coordenadores designados.
* **RF05 - Gestão de Líderes e Anfitriões:** Cadastro normalizado de pessoas, vinculando histórico de cultos liderados ou casas cedidas.
* **RF06 - Gestão de Participantes e Presença:** Inscrição de participantes por culto e controle de presença no dia do evento (check-in de visitantes e conversões).
* **RF07 - Monitoramento da Meta em Tempo Real:** Dashboard analítico exibindo o progresso dos 120 cultos, percentual alcançado por setor e alertas de setores deficitários.
* **RF08 - Relatórios & Exportação:** Exportação em CSV, Excel e PDF para reuniões pastorais da diretoria.
* **RF09 - Notificações & Integração WhatsApp:** Disparo de lembretes e links de localização para líderes e anfitriões via webhook/API de mensagens.

### 5.2. Requisitos Não Funcionais (RNF)
* **RNF01 - Arquitetura Limpa (Clean Architecture / Hexagonal):** Desacoplamento total entre regras de negócio (Domínio/Casos de Uso), persistência e protocolos de entrega (HTTP/REST/WebSockets).
* **RNF02 - Desempenho e Leveza:** PostgreSQL padrão puro (sem extensões GIS pesadas), com índices B-Tree otimizados em `setor`, `bairro` e `status`.
* **RNF03 - Resiliência e Concorrência:** Suporte a concorrência otimista com versionamento de entidade e transações ACID.
* **RNF04 - Padrões de API:** Endpoints RESTful seguindo a especificação OpenAPI 3.0 (Swagger), com validação estrita via DTOs.
* **RNF05 - Segurança:** Criptografia de senhas com Argon2/Bcrypt, autenticação stateless via JWT com rotação de Refresh Token, rate limiting e sanitização de entradas.

---

## 6. Modelagem de Domínio Rica (DDD - Domain-Driven Design)

Para garantir uma arquitetura robusta e escalável, dividimos o sistema em **Bounded Contexts (Contextos Delimitados)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SISTEMA CULTOS NOS LARES (PÃO DA VIDA)               │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│ Contexto Territorial│ Contexto Cultos & Metas  │ Contexto Pessoas & IAM│
│                     │                          │                       │
│  - Setor            │  - CultoNoLar (Agregado) │  - Usuario            │
│  - Coordenacao      │  - MetaCampanha          │  - Papel / Permissao  │
│  - Bairro           │  - LocalizacaoCulto      │  - Lider              │
│  - Logradouro       │  - StatusCulto           │  - Anfitriao          │
│  - LimiteGeoEspacial│  - ParticipanteCulto     │  - Membro/Visitante   │
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

### 6.1. Agregado Principal: `CultoNoLar`
* **Entidade Raiz:** `CultoNoLar`
* **Value Objects (Objetos de Valor):**
  * `EnderecoCompleto`: Logradouro, Número, Bairro, CEP, Complemento, PontoDeReferencia.
  * `CoordenadaGPS`: Latitude, Longitude (validadas geograficamente dentro dos limites do município de Mossoró).
  * `Telefone`: Número com DDD, validação de formato e sanitização.
  * `HorarioCulto`: Horário de início previsto.
* **Sub-entidades / Coleções do Agregado:**
  * `ParticipanteCulto`: Nome, Telefone, ÉVisitante (boolean), Presente (boolean).
* **Máquina de Estados de `StatusCulto`:**
  ```mermaid
  stateDiagram-v2
    [*] --> PLANEJADO: Cadastro do Culto
    PLANEJADO --> CONFIRMADO: Líder & Anfitrião Confirmam
    PLANEJADO --> CANCELADO: Cancelamento Pré-evento
    CONFIRMADO --> EM_ANDAMENTO: Início do Culto (19/11/2026)
    EM_ANDAMENTO --> REALIZADO: Relatório Pós-culto Preenchido
    CONFIRMADO --> CANCELADO: Imprevisto / Cancelamento
    REALIZADO --> [*]
    CANCELADO --> [*]
  ```

---

## 7. Modelagem Relacional Simplificada (PostgreSQL Padrão)

Atendendo à decisão arquitetural de **não utilizar a extensão PostGIS**, utilizamos o **PostgreSQL padrão puro** (`postgres:16-alpine`). O campo `setor` é gravado de forma explícita e direta em cada registro, mantendo a solução extremamente leve, sem extensões adicionais e compatível com qualquer provedor em nuvem (Neon, Supabase, Render, Railway, AWS RDS, etc.):

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Territorial: Tabela de Apoio dos 14 Setores Pastorais
CREATE TABLE setores (
    numero INTEGER PRIMARY KEY, -- 1 a 14
    nome VARCHAR(100) NOT NULL,
    coordenador_nome VARCHAR(150) NOT NULL,
    coordenador_contato VARCHAR(50),
    cor_hex VARCHAR(7) NOT NULL DEFAULT '#1D4225',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Territorial: Bairros vinculados
CREATE TABLE bairros (
    id SERIAL PRIMARY KEY,
    setor INTEGER NOT NULL REFERENCES setores(numero) ON DELETE RESTRICT,
    nome VARCHAR(120) NOT NULL UNIQUE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bairros_setor ON bairros(setor);

-- 3. IAM: Usuários & Perfis
CREATE TYPE user_role AS ENUM ('ADMIN', 'COORDENADOR', 'LIDER', 'COLABORADOR', 'VISITANTE');

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'COLABORADOR',
    setor INTEGER REFERENCES setores(numero) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pessoas (Líderes e Anfitriões)
CREATE TABLE pessoas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(180),
    igreja_origem VARCHAR(120) DEFAULT 'Igreja Pão da Vida',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pessoas_nome ON pessoas(nome);

-- 5. Domínio Central: Cultos nos Lares
CREATE TYPE status_culto AS ENUM ('PLANEJADO', 'CONFIRMADO', 'EM_ANDAMENTO', 'REALIZADO', 'CANCELADO');

CREATE TABLE cultos_no_lar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_sequencial SERIAL UNIQUE,
    campanha VARCHAR(100) DEFAULT '11 Anos - 120 Cultos nos Lares',
    
    -- Setor explícito como campo direto
    setor INTEGER NOT NULL REFERENCES setores(numero) ON DELETE RESTRICT,
    
    bairro VARCHAR(120) NOT NULL,
    rua VARCHAR(200) NOT NULL,
    numero VARCHAR(30),
    complemento VARCHAR(100),
    ponto_referencia VARCHAR(200),
    
    -- Coordenadas salvas diretamente em colunas numéricas padrão
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    x DECIMAL(8, 2), -- Coordenada X relativa do SVG (opcional para manter compatibilidade)
    y DECIMAL(8, 2), -- Coordenada Y relativa do SVG (opcional para manter compatibilidade)
    
    lider_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
    lider_nome VARCHAR(150) NOT NULL,
    lider_telefone VARCHAR(20),
    
    anfitriao_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
    anfitriao_nome VARCHAR(150),
    anfitriao_telefone VARCHAR(20),
    
    horario_inicio TIME WITHOUT TIME ZONE DEFAULT '19:30:00',
    data_realizacao DATE NOT NULL DEFAULT '2026-11-19',
    observacoes TEXT,
    status status_culto NOT NULL DEFAULT 'PLANEJADO',
    
    versao INTEGER NOT NULL DEFAULT 1, -- Optimistic Locking contra concorrência
    criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cultos_setor ON cultos_no_lar(setor);
CREATE INDEX idx_cultos_status ON cultos_no_lar(status);
CREATE INDEX idx_cultos_bairro ON cultos_no_lar(bairro);

-- 6. Participantes do Culto
CREATE TABLE participantes_culto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    culto_id UUID NOT NULL REFERENCES cultos_no_lar(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20),
    e_visitante BOOLEAN DEFAULT FALSE,
    presente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_participantes_culto ON participantes_culto(culto_id);

-- 7. Trilha de Auditoria (Audit Log)
CREATE TABLE logs_auditoria (
    id BIGSERIAL PRIMARY KEY,
    tabela VARCHAR(50) NOT NULL,
    registro_id UUID NOT NULL,
    operacao VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    dados_anteriores JSONB,
    dados_novos JSONB,
    executado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. Arquitetura de Software Proposta para o Backend

Recomendamos a implementação em **Clean Architecture (Hexagonal)** com Node.js (TypeScript + NestJS/Fastify) ou Go/C# (.NET 8+), garantindo isolamento total do núcleo de negócios:

```
src/
├── core/                           # Camada de Domínio Puro (Sem dependência externa)
│   ├── domain/
│   │   ├── entities/               # CultoNoLar, Setor, Bairro, Participante
│   │   ├── value-objects/          # CoordenadaGPS, Telefone, EnderecoCompleto
│   │   ├── events/                 # CultoCadastradoEvent, MetaAtingidaEvent
│   │   └── exceptions/             # DomainException, ForaDosLimitesException
│   └── ports/                      # Interfaces abstratas
│       ├── repositories/           # ICultoRepository, ISetorRepository
│       └── services/               # IGISService, IMessagingService
│
├── application/                    # Casos de Uso (Regras de Aplicação)
│   ├── use-cases/
│   │   ├── CadastrarCultoUseCase.ts
│   │   ├── AtualizarCultoUseCase.ts
│   │   ├── ListarCultosPorSetorUseCase.ts
│   │   ├── ObterMetasProgressoUseCase.ts
│   │   └── ExportarCultosCSVUseCase.ts
│   └── dtos/                       # DTOs de entrada e saída com validação
│
├── infrastructure/                 # Implementações concretas de tecnologia
│   ├── database/
│   │   ├── prisma/                 # Schema PostgreSQL padrão e Migrations
│   │   └── repositories/           # PostgresCultoRepository, PostgresSetorRepository
│   ├── security/                   # Bcrypt, JWT Strategy, Guard de RBAC
│   └── messaging/                  # Adaptador WhatsApp (Baileys/Twilio/Z-API)
│
└── presentation/                   # Interfaces de Entrada
    ├── http/
    │   ├── controllers/            # CultoController, SetorController, AuthController
    │   ├── middlewares/            # ErrorHandling, RequestLogger
    │   └── docs/                   # Swagger / OpenAPI
    └── websocket/                  # SSE ou WebSockets para atualização do mapa em tempo real
```

---

## 9. Próximos Passos Imediatos para a Execução

1. **Definição da Stack Tecnológica Oficial:**
   * **Backend:** Node.js com TypeScript (NestJS).
   * **Banco de Dados:** PostgreSQL 16 Padrão (sem PostGIS), com campo direto `setor` e coordenadas numéricas `latitude/longitude`.
   * **Frontend:** Manter o protótipo funcional integrado à nova API REST ou modernizar para React/Vite.
2. **Criação do Projeto Backend:**
   * Configuração inicial da pasta `backend/` com `package.json`, `tsconfig.json`, `docker-compose.yml` (`postgres:16-alpine`) e Prisma ORM.
3. **Implementação do Domínio e Casos de Uso:**
   * Entidades de domínio, DTOs e regras de validação dos 120 cultos.
