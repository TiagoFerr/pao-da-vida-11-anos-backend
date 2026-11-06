# Blueprint Arquitetural Completo: Sistema "120 Cultos nos Lares"
## Igreja Pão da Vida (Mossoró - RN) · 11 Anos

---

## 1. Visão Geral e Papel da Orquestração

Este documento define a **arquitetura de referência, modelagem conceitual, segurança, fluxos operacionais e eventos em tempo real** para o sistema dos 120 Cultos nos Lares da Igreja Pão da Vida.

### Decisões Arquiteturais Consolidadas:
* **Foco no Núcleo do Sistema:** Sem dependência de gateways externos pagos no momento (sem APIs pagas de WhatsApp/SMS).
* **Onboarding via Links de Convite Compartilháveis:** O Pastor gera links atrelados aos 14 setores e envia pelo WhatsApp para os Coordenadores; os Coordenadores visualizam os membros do seu setor e disparam links personalizados via WhatsApp para que os membros criem suas contas e recebam o papel de **Líder** ou **Anfitrião**.
* **Armazenamento de Mídia em MinIO (S3 Próprio):** Fotos dos cultos nos lares enviadas pelos líderes e armazenadas diretamente no bucket MinIO compatível com AWS S3 já hospedado pelo usuário.
* **Banco de Dados:** **PostgreSQL 16 Padrão Puro** (sem PostGIS), com o campo `setor` explícito na tabela e coordenadas decimais padrão.
* **Atualizações em Tempo Real via SSE Segmentado:** Pastores/Admins recebem o feed global de Mossoró e fotos ao vivo; Coordenadores recebem as atualizações do seu setor.
* **Contas Próprias para Cada Papel:** Pastores, Coordenadores, Líderes e Anfitriões possuem credenciais e painéis com permissões distintas.
* **Gestão de Membros vs. Visitantes:** Membros da igreja lideram e acolhem; registro detalhado de participantes com identificação de quem **"Aceitou a Jesus" (Novas Decisões / Reconciliações)** para fins de discipulado e consolidação pastoral.

---

## 2. Diagrama de Arquitetura de Alto Nível (C4 - Containers)

```mermaid
flowchart TD
    subgraph Clientes["Atores & Clientes"]
        AdminWeb["Painel Pastoral / Admin (Desktop)\n- Telão de Acompanhamento\n- Consome Stream SSE em Tempo Real"]
        LiderWeb["App Web do Líder de Culto\n- Criação de Culto\n- Check-in de Presenças\n- Registro de 'Aceitou a Jesus'"]
        AnfitriaoWeb["Portal do Anfitrião\n- Confirmação de Residência\n- Acompanhamento do Culto no Lar"]
    end

    subgraph Borda["Borda & Segurança"]
        Gateway["Reverse Proxy / Nginx\n- SSL / HTTPS\n- Suporte a Conexões Longas HTTP (SSE)\n- Rate Limiting"]
    end

    subgraph Backend["Backend Modular Node.js (NestJS / TypeScript)"]
        AuthModule["Módulo de Autenticação & IAM\n- Contas (Pastores, Líderes, Anfitriões)\n- Argon2id / Bcrypt + JWT + Refresh Token\n- RBAC Granular"]
        CultosModule["Módulo de Cultos no Lar\n- Criação e Gestão de Cultos\n- Campo explícito 'setor' (1..14)\n- Máquina de Estados"]
        FotosModule["Módulo de Mídia & Fotos\n- Integração MinIO (AWS S3 SDK)\n- Presigned URLs & Validação de Imagem\n- Galeria do Lar"]
        MembrosPresencaModule["Módulo de Membros & Presenças\n- Cadastro Base de Membros da Igreja\n- Visitantes externos\n- Registro de Presença & 'Aceitou a Jesus'"]
        SetoresModule["Módulo Territorial\n- 14 Setores Pastorais de Mossoró\n- Bairros e Metas"]
        SSEModule["Módulo SSE (Server-Sent Events)\n- Stream segmentado: Admin & Coordenadores\n- Eventos: Cultos, Presenças, Decisões, Fotos"]
        AuditModule["Módulo de Auditoria\n- Rastreabilidade de alterações"]
    end

    subgraph Persistencia["Armazenamento & Estado"]
        Postgres[(PostgreSQL 16 Padrão\n- Tabelas Relacionais\n- Índices Otimizados B-Tree)]
        Redis[(Redis 7 In-Memory\n- Sessões e Refresh Tokens\n- Pub/Sub para eventos SSE)]
        MinIO[(MinIO Object Storage - S3\n- Bucket: cultos-fotos\n- Fotos dos Lares em Alta Resolução)]
    end

    AdminWeb --> Gateway
    LiderWeb --> Gateway
    AnfitriaoWeb --> Gateway

    Gateway --> AuthModule
    Gateway --> CultosModule
    Gateway --> FotosModule
    Gateway --> MembrosPresencaModule
    Gateway --> SetoresModule
    Gateway --> SSEModule

    Backend --> Postgres
    Backend --> Redis
    Backend --> MinIO
    LiderWeb -.->|Upload Direto via Presigned URL| MinIO
    SSEModule -.->|Push de Eventos ao Vivo + Fotos| AdminWeb
```

---

## 3. Arquitetura do SSE (Server-Sent Events) Segmentado (Admin & Coordenadores)

O **SSE (Server-Sent Events)** utiliza uma conexão HTTP unidirecional persistente (`text/event-stream`), muito mais leve que WebSockets para cenários de monitoramento contínuo onde os clientes apenas recebem dados.

### 3.1. Regras de Segurança e Segmentação por Perfil (Scoped Streams)
* **Endpoint:** `GET /api/v1/sse/stream`
* **Autenticação:** Token JWT validado no handshake inicial (via Header `Authorization: Bearer <token>` ou Cookie HttpOnly seguro).
* **Guarda de Autorização e Segmentação (Guard):**
  * **`ADMIN` / `PASTOR`:** Inscreve-se no canal global (`admin-events`), recebendo o panorama de toda a cidade de Mossoró (todos os 14 setores).
  * **`COORDENADOR`:** Inscreve-se automaticamente no canal do seu setor (`setor-{numero}-events`) E no canal de comunicados gerais (`broadcast-events`), sem poluição de dados de outros setores.
  * **Demais perfis (`LIDER`, `ANFITRIAO`):** Acesso negado com `403 Forbidden`.

### 3.2. Catálogo de Eventos Transmitidos no SSE

```mermaid
sequenceDiagram
    autonumber
    actor Lider as Líder do Culto (Setor 5)
    participant API as Backend NestJS
    participant Redis as Redis (Pub/Sub Event Bus)
    participant SSE as SSE Gateway (Multi-Channel)
    actor Pastor as Pastor / Admin (Telão Geral)
    actor Coord5 as Coordenador Setor 5 (Pb. Adriano)

    Pastor->>SSE: Conecta em GET /api/v1/sse/stream (JWT Admin)
    Coord5->>SSE: Conecta em GET /api/v1/sse/stream (JWT Coordenador Setor 5)

    Note over Lider, API: 1. Novo Culto Cadastrado
    Lider->>API: POST /api/v1/cultos (Cria culto no Setor 5)
    API->>Redis: PUBLISH 'admin-events' { event: 'culto.cadastrado', setor: 5, ... }
    API->>Redis: PUBLISH 'setor-5-events' { event: 'culto.cadastrado', ... }
    Redis->>SSE: Notifica canais
    SSE-->>Pastor: EVENT: culto.cadastrado (Atualiza mapa e placar global)
    SSE-->>Coord5: EVENT: setor.culto.cadastrado (Notifica novo lar no seu setor!)

    Note over Lider, API: 2. Noite do Culto (19/11): Check-in e "Aceitou a Jesus"
    Lider->>API: POST /api/v1/cultos/:id/decisoes { nome: "João", aceitouJesus: true }
    API->>Redis: PUBLISH 'admin-events' { event: 'vida.para.cristo', setor: 5, nome: "João" }
    API->>Redis: PUBLISH 'setor-5-events' { event: 'setor.vida.para.cristo', nome: "João" }
    Redis->>SSE: Notifica canais
    SSE-->>Pastor: EVENT: vida.para.cristo (Alerta telão da igreja)
    SSE-->>Coord5: EVENT: setor.vida.para.cristo (Notifica para consolidação no setor)
```

| Nome do Evento | Destinatários | Dados Enviados |
| :--- | :---: | :--- |
| `culto.cadastrado` | Admin e Coordenador do Setor | ID, Setor, Bairro, Endereço, Nome do Líder, Nome do Anfitrião |
| `meta.progresso` | Admin e Coordenador do Setor | Total geral (120 lares) e total específico do setor do coordenador |
| `culto.alerta_pendencia`| Coordenador do Setor | Culto sem anfitrião confirmado ou sem líder definido no setor |
| `culto.iniciado` | Admin e Coordenador do Setor | Culto que iniciou a reunião e total de participantes no check-in |
| `vida.para.cristo` | Admin e Coordenador do Setor | Nome da pessoa que aceitou a Jesus, telefone, bairro e lar onde ocorreu |
| `comunicado.pastoral` | Admin e Todos os Coordenadores | Mensagem em broadcast enviada pelo Pastor Gabriel para a liderança |

---

## 4. Gestão de Contas, Papéis e Matriz de Permissões (RBAC)

Cada perfil possui sua própria conta de acesso com funcionalidades específicas:

```mermaid
flowchart LR
    subgraph Perfis["Hierarquia de Contas"]
        Admin["PASTOR / ADMIN\n(Pr. Gabriel / Pastores)\n- Visão Geral & Telão SSE Global\n- Gestão de Contas\n- Relatório de Decisões"]
        Coord["COORDENADOR_SETOR\n(14 Setores de Mossoró)\n- Stream SSE do seu Setor\n- Validação dos Lares e Líderes"]
        Lider["LIDER_CULTO\n(Membro da Igreja)\n- Cadastra seu culto\n- Check-in de Membros e Visitantes\n- Registra quem Aceitou a Jesus"]
        Anf["ANFITRIAO\n(Dono da Residência)\n- Visualiza seu Lar\n- Confirma disponibilidade da casa"]
    end
```

### Matriz Detalhada de Permissões:

| Funcionalidade | ADMIN / PASTOR | COORDENADOR | LÍDER DE CULTO | ANFITRIÃO |
| :--- | :---: | :---: | :---: | :---: |
| **Acessar Stream SSE em Tempo Real** | ✅ **Global (Toda Cidade)** | ✅ **Do seu Setor + Avisos** | ❌ Não | ❌ Não |
| **Gerenciar Contas de Usuários** | ✅ Cria/Edita contas | ❌ Não | ❌ Não | ❌ Não |
| **Cadastrar Culto no Lar** | ✅ Qualquer setor | ✅ No seu setor | ✅ No seu lar/designado | ❌ Não |
| **Editar Dados do Culto** | ✅ Todos | ✅ Do seu setor | ✅ Apenas seu culto | ❌ Apenas obs da casa |
| **Registrar Lista de Presença** | ✅ Todos | ✅ Do seu setor | ✅ Do seu culto | ❌ Não |
| **Registrar "Aceitou a Jesus"** | ✅ Todos | ✅ Do seu setor | ✅ Do seu culto | ❌ Não |
| **Visualizar Relatório de Decisões**| ✅ Total consolidado | ✅ Do seu setor | ❌ Apenas do seu culto | ❌ Não |
| **Exportar Planilhas (CSV/Excel)** | ✅ Cidade inteira | ✅ Do seu setor | ❌ Não | ❌ Não |

---

## 5. Modelagem de Dados Relacional Completa (PostgreSQL Padrão)

O esquema atende perfeitamente à separação de **Membros da Igreja**, **Visitantes**, **Presença** e **Decisões Espirituais**:

```mermaid
erDiagram
    SETORES ||--o{ CULTOS_NO_LAR : "possui"
    SETORES ||--o{ BAIRROS : "engloba"
    SETORES ||--o{ USUARIOS : "vincula_coordenador"
    
    USUARIOS ||--o{ CULTOS_NO_LAR : "lidera_ou_cria"
    USUARIOS ||--o{ REFRESH_TOKENS : "possui_sessoes"
    
    PESSOAS ||--o{ USUARIOS : "pode_ter_conta"
    PESSOAS ||--o{ CULTOS_NO_LAR : "lidera_ou_hospeda"
    
    CULTOS_NO_LAR ||--o{ PRESENCAS_CULTO : "possui_participantes"
    CULTOS_NO_LAR ||--o{ DECISOES_ESPIRITUAIS : "gera_frutos"
    CULTOS_NO_LAR ||--o{ FOTOS_CULTO : "possui_galeria_fotos"
    
    PESSOAS ||--o{ PRESENCAS_CULTO : "participa"
    PESSOAS ||--o{ DECISOES_ESPIRITUAIS : "decide_por_cristo"
    USUARIOS ||--o{ FOTOS_CULTO : "envia_foto"
    USUARIOS ||--o{ CONVITES_CONTA : "gera_convites"
    SETORES ||--o{ CONVITES_CONTA : "restringe_setor"
    PESSOAS ||--o{ CONVITES_CONTA : "convida_membro"

    SETORES {
        int numero PK "1 a 14"
        string nome "Ex: Setor 1 - Abolição"
        string coordenador_nome "Ex: Pr. Rúbens Nunes"
        string coordenador_telefone
        string cor_hex
    }

    BAIRROS {
        int id PK
        int setor FK
        string nome
        decimal latitude
        decimal longitude
    }

    PESSOAS {
        uuid id PK
        string nome "Nome completo"
        string telefone "Telefone para contato / WhatsApp"
        string email
        string tipo_vinculo "MEMBRO_ATIVO | VISITANTE | FREQUENTADOR"
        string endereco
        string bairro
        timestamp created_at
    }

    USUARIOS {
        uuid id PK
        uuid pessoa_id FK "Vínculo com o cadastro da pessoa (opcional)"
        string email UK
        string senha_hash "Argon2id ou Bcrypt"
        string role "ADMIN | PASTOR | COORDENADOR | LIDER | ANFITRIAO"
        int setor FK "Setor vinculado para coordenadores"
        boolean ativo
        timestamp created_at
    }

    CULTOS_NO_LAR {
        uuid id PK
        int numero_sequencial "Contador global 1..120"
        string campanha "11 Anos - 120 Cultos nos Lares"
        int setor FK "CAMPO EXPLÍCITO DO SETOR (1 a 14)"
        string bairro
        string rua
        string numero
        string ponto_referencia
        decimal latitude "DECIMAL(10,8)"
        decimal longitude "DECIMAL(11,8)"
        decimal x "X relativo mapa"
        decimal y "Y relativo mapa"
        
        uuid lider_usuario_id FK "Conta do líder responsável"
        string lider_nome
        string lider_telefone
        
        uuid anfitriao_usuario_id FK "Conta do anfitrião (opcional)"
        string anfitriao_nome
        string anfitriao_telefone
        
        time horario_inicio "Default: 19:30"
        date data_realizacao "2026-11-19"
        string status "PLANEJADO | CONFIRMADO | EM_ANDAMENTO | REALIZADO | CANCELADO"
        text observacoes
        int versao "Controle de concorrência"
        uuid criado_por FK
        timestamp created_at
        timestamp updated_at
    }

    PRESENCAS_CULTO {
        uuid id PK
        uuid culto_id FK
        uuid pessoa_id FK "Pessoa cadastrada (se houver)"
        string nome_participante "Nome informado no momento"
        string telefone "Telefone para contato"
        boolean e_membro "true = Membro Pão da Vida, false = Visitante"
        boolean presente "Check-in confirmado"
        timestamp checkin_em
    }

    DECISOES_ESPIRITUAIS {
        uuid id PK
        uuid culto_id FK "Culto onde ocorreu a decisão"
        uuid presenca_id FK "Vinculo com a presença"
        string nome_decidido "Nome da pessoa"
        string telefone "Contato para acompanhamento"
        string tipo_decisao "ACEITOU_JESUS | RECONCILIACAO | PEDIDO_ORACAO"
        text pedido_oracao_detalhe
        string encaminhado_para_discipulado "PENDENTE | EM_CONTATO | DISCIPULANDO"
        uuid registrado_por_usuario_id FK
        timestamp created_at
    }

    FOTOS_CULTO {
        uuid id PK
        uuid culto_id FK "Vínculo com o lar"
        string s3_key "Chave no MinIO (ex: cultos/id/foto.webp)"
        string url_publica "URL de acesso ao MinIO"
        string nome_original "Nome do arquivo original"
        string mime_type "image/jpeg, image/png, image/webp"
        bigint tamanho_bytes "Tamanho da imagem"
        string legenda "Legenda opcional (ex: Oração final)"
        boolean aprovado_para_telao "Permissão para passar no telão da igreja"
        uuid enviado_por_usuario_id FK "Líder que enviou a foto"
        timestamp created_at
    }

    CONVITES_CONTA {
        uuid id PK
        string token_hash UK "Token criptográfico único"
        string tipo_papel "COORDENADOR | LIDER | ANFITRIAO"
        int setor FK "Setor vinculado"
        uuid pessoa_id FK "Membro pré-identificado (opcional)"
        string telefone_destinatario
        string nome_destinatario
        timestamp expira_em
        boolean utilizado
        uuid criado_por_usuario_id FK
        timestamp created_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid usuario_id FK
        string token_hash UK
        timestamp expires_at
        boolean revogado
    }
```

---

## 6. Fluxo de Vida do Culto & Acompanhamento Espiritual

```mermaid
flowchart TD
    A[Líder de Culto autenticado] --> B[Cadastra Culto no Lar informando Setor 1..14]
    B --> C[Backend emite evento SSE: culto.cadastrado]
    C --> D[Telão / Painel dos Pastores atualiza a contagem dos 120 Lares]
    
    B --> E[Noite do Evento: 19/11/2026 às 19:30]
    E --> F[Líder acessa o app e abre a lista de Presenças do seu lar]
    
    F --> G{Tipo de Participante}
    G -->|Membro da Igreja| H[Marca presença e confirma vínculo]
    G -->|Visitante externo| I[Adiciona Nome + Telefone do Visitante]
    
    H & I --> J{Houve decisão espiritual?}
    J -->|Sim: 'Aceitou a Jesus' ou Reconciliação| K[Registra 'Aceitou a Jesus' + Dados de Contato]
    K --> L[Backend grava em DECISOES_ESPIRITUAIS]
    L --> M[SSE emite evento: vida.para.cristo]
    M --> N[Painel Pastoral do Pr. Gabriel acende alerta imediato de celebração e discipulado!]
    
    J -->|Não| O[Finaliza culto com relatório de presença]
    K --> O
    O --> P[Status do Culto alterado para REALIZADO]
```

---

## 7. Arquitetura de Upload e Armazenamento de Fotos com MinIO (S3 Próprio)

Para suportar o envio de fotos dos 120 lares em tempo real sem sobrecarregar o tráfego do Node.js, adotamos o padrão de **URLs Pré-assinadas (Presigned URLs)** via `@aws-sdk/client-s3` conectado ao **MinIO** do usuário:

```mermaid
sequenceDiagram
    autonumber
    actor Lider as Líder de Culto (Celular / Web)
    participant API as Backend NestJS (FotosModule)
    participant MinIO as MinIO (S3 Object Storage)
    participant DB as PostgreSQL
    participant SSE as SSE Gateway (Admin / Telão)

    Lider->>API: 1. POST /api/v1/cultos/:id/fotos/presigned-url { fileName, mimeType }
    API->>API: Valida se o usuário é líder deste culto e tamanho/mime
    API->>MinIO: Solicita Presigned PUT URL (TTL: 5 minutos)
    MinIO-->>API: Retorna URL de Upload temporária
    API-->>Lider: Retorna { uploadUrl, key, publicUrl }

    Note over Lider, MinIO: 2. Upload Direto do Celular para o MinIO
    Lider->>MinIO: HTTP PUT na uploadUrl com o arquivo binário da foto
    MinIO-->>Lider: 200 OK (Upload Concluído)

    Note over Lider, API: 3. Confirmação do Registro da Foto
    Lider->>API: POST /api/v1/cultos/:id/fotos/confirmar { key, legenda }
    API->>DB: Salva metadados em FOTOS_CULTO
    API->>SSE: Emite evento 'culto.foto_adicionada'
    SSE-->>Lider: 201 Created (Foto registrada)
    SSE-->>Lider: (Telão do Aniversário exibe foto do lar em tempo real!)
```

### Vantagens Desta Abordagem:
1. **Zero Sobrecarga de Memória no Backend:** O streaming binário de fotos de 5MB–10MB vai direto do celular para o MinIO, sem consumir CPU e RAM da API NestJS.
2. **Compatibilidade com S3:** Utiliza a SDK padrão da AWS apontando para o endpoint do MinIO local (`s3Client = new S3Client({ endpoint: MINIO_ENDPOINT, credentials: ... })`).
3. **Curadoria para o Telão da Igreja:** A coluna `aprovado_para_telao` permite aos pastores/mídia selecionar as fotos mais marcantes dos lares para projetar durante o culto de celebração na sede da igreja.

---

## 8. Mapeamento de Endpoints da API REST Atualizada

### Autenticação & Gestão de Contas (`/api/v1/auth` e `/api/v1/usuarios`)
* `POST /api/v1/auth/login` -> Login com email e senha (retorna JWT e Refresh Token).
* `POST /api/v1/auth/refresh` -> Renovação de token de acesso.
* `POST /api/v1/auth/logout` -> Encerramento da sessão.
* `GET  /api/v1/auth/me` -> Perfil da conta conectada e role ativa.
* `POST /api/v1/usuarios` -> *(Admin/Pastor)* Cria nova conta manual.
* `GET  /api/v1/usuarios` -> *(Admin/Pastor)* Lista contas com filtros por role e setor.

### Convites e Onboarding via WhatsApp (`/api/v1/convites`)
* `POST /api/v1/convites/coordenador` -> *(Pastor)* Gera link de convite atrelado a um dos 14 setores para envio via WhatsApp.
* `POST /api/v1/convites/membro` -> *(Coordenador/Pastor)* Gera link para membro do setor criar conta e atribui papel (`LIDER`, `ANFITRIAO` ou `AMBOS`).
* `GET  /api/v1/convites/validar` -> *(Público via Link)* Valida token criptográfico e retorna dados pré-preenchidos da igreja e setor.
* `POST /api/v1/convites/ativar` -> *(Público via Link)* Cria a conta, define a senha e ativa o acesso no sistema.
* `GET  /api/v1/convites/setor/:setorId` -> *(Coordenador/Admin)* Lista status de convites (pendentes/utilizados) com opção de reenvio.

### Stream em Tempo Real (`/api/v1/sse`)
* `GET /api/v1/sse/stream` -> **Exclusivo para ADMIN, PASTOR e COORDENADOR**. Stream contínuo segmentado:
  * Admins/Pastores recebem o feed global de Mossoró (incluindo fotos ao vivo).
  * Coordenadores recebem os eventos específicos do seu setor (1..14) e comunicados da liderança.

### Cultos nos Lares (`/api/v1/cultos`)
* `POST   /` -> *(Líder/Coordenador/Admin)* Cria novo culto com campo `setor` (1..14).
* `GET    /` -> Lista de cultos com paginação e filtros (`setor`, `bairro`, `status`).
* `GET    /:id` -> Detalhes completos do culto e anfitrião.
* `PUT    /:id` -> Atualização das informações da casa/líder.
* `PATCH  /:id/status` -> Transição de status (`PLANEJADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`).

### Galeria de Fotos & MinIO S3 (`/api/v1/cultos/:id/fotos`)
* `POST   /:id/fotos/presigned-url` -> *(Líder)* Gera URL pré-assinada de upload direto no MinIO.
* `POST   /:id/fotos/confirmar` -> *(Líder)* Salva metadados da foto após upload no MinIO e emite SSE.
* `GET    /:id/fotos` -> Lista a galeria de fotos do culto no lar.
* `PATCH  /fotos/:fotoId/telao` -> *(Admin/Mídia)* Aprova ou reprova foto para exibição no telão.
* `DELETE /fotos/:fotoId` -> *(Líder/Admin)* Remove foto do MinIO e banco.

### Presenças e "Aceitou a Jesus" (`/api/v1/cultos/:id/presencas` e `decisoes`)
* `GET  /:id/presencas` -> Lista de quem está confirmado no lar.
* `POST /:id/presencas` -> Check-in de membro ou visitante (Nome, Telefone, `e_membro: boolean`).
* `POST /:id/decisoes` -> **Registro de decisão ("Aceitou a Jesus" / Reconciliação)**. Dispara evento instantâneo no SSE dos Pastores.
* `GET  /api/v1/relatorios/decisoes` -> *(Admin/Pastor)* Relatório consolidado para o ministério de consolidação e discipulado.

### Territorial & Metas (`/api/v1/setores` e `/api/v1/metas`)
* `GET /api/v1/setores` -> Lista dos 14 setores e seus coordenadores.
* `GET /api/v1/metas/progresso` -> Contador dos 120 cultos e resumo por setor.
* `GET /api/v1/metas/exportar/csv` -> Download da planilha completa com dados de líderes, anfitriões e totais.

---

## 9. Modelagem do Repositório e Pipeline CI/CD (GitHub Actions)

Para garantir qualidade contínua, governança e deploy seguro, modelamos a estrutura do repositório e os fluxos automatizados de integração e entrega contínua:

### 9.1. Organização do Repositório (Monorepo Limpo)
```
/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Pipeline de Integração Contínua (Lint, Testes, Build)
│   │   └── cd.yml                     # Pipeline de Deploy Contínuo (Docker Build & Release)
│   └── pull_request_template.md       # Checklist de PR (regras de negócio e cobertura)
│
├── backend/                           # API REST Modular NestJS
│   ├── src/                           # Código-fonte (Clean Architecture)
│   ├── prisma/                        # Schemas e Migrations do PostgreSQL
│   ├── test/                          # Testes unitários e e2e
│   ├── Dockerfile                     # Imagem de produção multi-stage otimizada
│   ├── docker-compose.yml             # Ambiente local (PostgreSQL 16 + Redis 7)
│   └── package.json
│
├── frontend/                          # Aplicação Web dos Cultos no Lar
│   └── ...                            # Componentes, mapas e telas
│
├── docs/                              # Documentações e diagramas
├── .gitignore                         # Ignora node_modules, .env, dist, etc.
└── README.md                          # Guia de onboarding para desenvolvedores
```

### 9.2. Estratégia de Branches & Commits
* **Estratégia Simplificada (Single-Environment / Main-Only Deploy):**
  * Sem ambiente de homologação no momento para manter a operação enxuta e direta.
  * `main`: Branch principal de produção. Toda mesclagem aprovada na `main` dispara o deploy imediato para a VPS.
  * `feature/*` e `fix/*`: Branches de desenvolvimento onde o desenvolvedor trabalha e abre Pull Request para a `main`. O CI roda no PR para garantir que nada quebrado chegue à `main`.
* **Padrão de Commits (Conventional Commits):**
  * `feat(auth): adiciona fluxo de convite via token para coordenador`
  * `fix(cultos): corrige validacao de setor 1..14 no cadastro`
  * `test(presencas): adiciona testes unitarios de registro de decisao espiritual`

---

### 9.3. Fluxo de CI (Integração Contínua - `.github/workflows/ci.yml`)

O CI roda automaticamente em **todos os Pull Requests** e em qualquer push para a branch `main`:

```mermaid
flowchart LR
    A[Push / Pull Request] --> B[Checkout & Cache de Deps]
    B --> C[npm ci]
    C --> D[1. Linter & Prettier]
    C --> E[2. TypeCheck: tsc --noEmit]
    C --> F[3. Prisma Validate & Format]
    
    D & E & F --> G[4. Testes Unitários: Jest]
    G --> H[5. Testes de Integração com Services Postgres & Redis]
    H --> I[6. Build de Produção: nest build]
    I --> J{Sucesso?}
    J -->|Sim| K[✅ PR Aprovado para Merge]
    J -->|Não| L[❌ Falha no Pipeline / Bloqueia Merge]
```

#### Especificação Técnica do Job de CI:
1. **Ambiente:** `ubuntu-latest` com Node.js 22.
2. **Serviços no CI (Containers):**
   * PostgreSQL 16 (`image: postgres:16-alpine`) para testes reais de migrations.
   * Redis 7 (`image: redis:7-alpine`) para validar o Pub/Sub de SSE.
3. **Passos Automatizados:**
   * `Lint`: Validação estrita de padrões de código (sem `any` desnecessário).
   * `TypeCheck`: Compilação TypeScript em modo de verificação sem emitir arquivos.
   * `Prisma Schema Validation`: Garante que as migrations e modelos relacionais estão íntegros.
   * `Testes com Cobertura`: Execução de suíte de testes unitários de casos de uso com relatório de cobertura.
   * `Build Check`: Garante que a aplicação compila 100% sem erros de empacotamento.

---

### 9.4. Fluxo de CD e Deploy na VPS (`.github/workflows/cd.yml`)

Como toda a aplicação rodará na **sua VPS própria** (onde o MinIO já está operando), o deploy é automatizado de ponta a ponta via GitHub Actions conectando à VPS por SSH:

```mermaid
flowchart TD
    A[Merge na Branch 'main'] --> B[GitHub Actions: Build da Imagem Docker]
    B --> C[Push da Imagem para o GitHub Packages / Docker Hub]
    C --> D[Conexão SSH Segura com a sua VPS]
    D --> E[Pull da Nova Imagem na VPS]
    E --> F[docker compose -f docker-compose.prod.yml up -d]
    F --> G[Execução das Migrations: npx prisma migrate deploy]
    G --> H[Verificação de Saúde: Healthcheck GET /api/v1/health]
    H --> I[✅ Sistema Atualizado na VPS em Produção]
```

#### Configuração de Borda na VPS (Nginx Otimizado para SSE e MinIO):
Para que as conexões de **SSE (Server-Sent Events)** para os Pastores e Coordenadores não sofram *timeout* ou fiquem presas em *buffer* no Nginx da VPS:
```nginx
# Configuração Nginx na VPS para a API e SSE
location /api/v1/sse/ {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    
    # CRUCIAL PARA SSE NA VPS:
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    proxy_read_timeout 86400s; # Conexão contínua de até 24h
}
```

### 9.5. Dockerfile Multi-Stage de Produção (Segurança e Performance)
Para garantir que a imagem Docker seja leve (~120MB) e segura:
* **Stage 1 (Builder):** Instala dependências completas, compila TypeScript com NestJS e gera client do Prisma.
* **Stage 2 (Runner):** Copia apenas o diretório `dist/` compilado e dependências de produção (`--omit=dev`).
* **Segurança:** A aplicação roda sob um usuário sem privilégios de root (`USER node`).

---

## 10. Governança e Próximos Passos

Com esta modelagem refinada, o plano de execução está 100% definido:
* ✅ **Fase 1: Arquitetura & Modelagem (Concluída)**
* ⏳ **Fase 2: Infraestrutura Base (Docker Compose PostgreSQL 16 + Redis + Setup NestJS)**
* ⏳ **Fase 3: Prisma Schema com as novas tabelas (`usuarios`, `cultos_no_lar`, `presencas_culto`, `decisoes_espirituais`, `fotos_culto`, `setores`) e Adaptador MinIO S3**
* ⏳ **Fase 4: Implementação do Módulo de Auth (Contas próprias com Argon2/JWT) e SSE Guard**
* ⏳ **Fase 5: Casos de Uso de Cultos, Presenças e Decisões Espirituais**
* ⏳ **Fase 6: Painel e Integração com Frontend**
