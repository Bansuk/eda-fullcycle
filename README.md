# EDA Fullcycle – Wallet Core + Balances Service

Demonstração de Arquitetura Orientada por Eventos construída com **Go** (produtor Wallet Core) e **TypeScript** (consumidor Balances), conectados via **Apache Kafka**.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│ Rede Docker                                                         │
│                                                                     │
│  ┌────────────┐   POST /transactions   ┌──────────────────────────┐ │
│  │   Cliente  │ ──────────────────────▶│  Wallet Core (Go :8080)  │ │
│  └────────────┘                        │  MySQL: wallet           │ │
│                                        └──────────┬───────────────┘ │
│                                                   │ BalanceUpdated  │
│                                                   ▼                 │
│                                        ┌──────────────────────────┐ │
│                                        │ Tópico Kafka: balances   │ │
│                                        └──────────┬───────────────┘ │
│                                                   │                 │
│                                                   ▼                 │
│  ┌────────────┐  GET /balances/{id}   ┌──────────────────────────┐  │
│  │   Cliente  │ ◀───────────────────  │  Serviço Balances (TS    │  │
│  └────────────┘                       │ :3003) MySQL: balance    │  │
│                                       └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Serviços

| Serviço          | Tecnologia | Porta | Descrição                                 |
| ---------------- | ---------- | ----- | ----------------------------------------- |
| `goapp`          | Go         | 8080  | Wallet Core – REST API + produtor Kafka   |
| `mysql`          | MySQL 5.7  | 3306  | Banco de dados Wallet Core                |
| `balances`       | TypeScript | 3003  | Serviço Balances – consumidor Kafka + API |
| `balances-mysql` | MySQL 5.7  | 3307  | Banco de dados Serviço Balances           |
| `kafka`          | Confluent  | 9092  | Message broker                            |
| `zookeeper`      | Confluent  | 2181  | Coordenador Kafka                         |
| `control-center` | Confluent  | 9021  | Interface Kafka                           |

---

## Tópicos Kafka

| Tópico         | Produtor    | Consumidor       | Payload                                                   |
| -------------- | ----------- | ---------------- | --------------------------------------------------------- |
| `transactions` | Wallet Core | —                | evento `TransactionCreated`                               |
| `balances`     | Wallet Core | Serviço Balances | evento `BalanceUpdated` com `account_id_from/to` + saldos |

### Formato de mensagem `BalanceUpdated` (tópico: `balances`)

```json
{
	"Name": "BalanceUpdated",
	"Payload": {
		"account_id_from": "f8df753c-3b58-43aa-8016-12aaa4f1ea3e",
		"account_id_to": "0216ea38-524f-4e85-8743-d484a8f7538e",
		"balance_account_id_from": 900.0,
		"balance_account_id_to": 600.0
	}
}
```

---

## Início Rápido

### Pré-requisitos

- Docker ≥ 24
- Docker Compose ≥ 2

### 1. Inicie todo o ecossistema

```bash
docker compose up -d
```

Este comando único irá:

- Iniciar Zookeeper + Kafka + Confluent Control Center
- Iniciar ambos os bancos MySQL (wallet e balances)
- Executar scripts de inicialização SQL: schema + dados iniciais para ambos (somente primeira execução)
- Construir e iniciar o aplicativo Go Wallet Core em `:8080`
- Construir e iniciar o Serviço Balances TypeScript em `:3003`

> **Nota de primeira execução:** O aplicativo Go é compilado dentro do container na primeira inicialização, o que pode levar ~30–60 s. Aguarde o log `Server is running` antes de enviar requisições.

### 2. Verifique se os serviços estão executando

```bash
docker compose ps
```

---

## Dados Iniciais

Ambos os bancos são pré-populados na primeira execução:

### Wallet Core (`wallet` DB)

| Entidade | ID                                     | Nome        | Saldo   |
| -------- | -------------------------------------- | ----------- | ------- |
| Cliente  | `f4a498a7-5f0c-4ead-8f3b-d5a48264a2b1` | Alice Smith | —       |
| Cliente  | `8b38afc4-1e47-4f9d-a2f5-ef12dc0c3c34` | Bob Jones   | —       |
| Conta    | `f8df753c-3b58-43aa-8016-12aaa4f1ea3e` | Alice       | 1000.00 |
| Conta    | `0216ea38-524f-4e85-8743-d484a8f7538e` | Bob         | 500.00  |

---

## Referência de API

### Wallet Core (`http://localhost:8080`)

| Método | Caminho         | Descrição                |
| ------ | --------------- | ------------------------ |
| POST   | `/clients`      | Criar um novo cliente    |
| POST   | `/accounts`     | Criar uma nova conta     |
| POST   | `/transactions` | Criar uma nova transação |

Veja [api/client.http](api/client.http) para requisições prontas para executar.

### Serviço Balances (`http://localhost:3003`)

| Método | Caminho                  | Descrição                  |
| ------ | ------------------------ | -------------------------- |
| GET    | `/balances/{account_id}` | Obter saldo da conta atual |

Veja [balances/api/balances.http](balances/api/balances.http) para requisições prontas para executar.å

## Desenvolvimento

### Tecnologias Utilizadas

- **Go** – Linguagem de programação para o Wallet Core
- **TypeScript/Node.js** – Linguagem e runtime para o Serviço Balances
  - Express.js – Framework web
  - MySQL2 – Cliente MySQL
- **Apache Kafka** – Message broker para comunicação assíncrona entre serviços
  - Confluent Kafka – Distribuição completa do Kafka
  - Zookeeper – Coordenação do cluster Kafka
  - Confluent Control Center – Interface web para gerenciar Kafka
- **MySQL 5.7** – Banco de dados relacional para ambos os serviços
- **Docker & Docker Compose** – Containerização e orquestração
- **SQL** – Scripts de inicialização para schema e dados iniciais

## Estrutura do Projeto

```
.
├── cmd/walletcore/main.go      # Ponto de entrada Wallet Core
├── internal/                   # Camada de domínio Go
│   ├── entity/                 # Entidades de domínio
│   ├── usecase/                # Casos de uso da aplicação
│   ├── event/                  # Eventos de domínio + manipuladores Kafka
│   ├── database/               # Repositórios MySQL
│   ├── gateway/                # Interfaces de repositório
│   └── web/                    # Manipuladores HTTP
├── pkg/                        # Pacotes Go compartilhados
│   ├── events/                 # Distribuidor de eventos
│   ├── kafka/                  # Produtor/consumidor Kafka
│   └── uow/                    # Unidade de Trabalho
├── balances/                   # Microsserviço Balances (TypeScript)
│   ├── src/
│   │   ├── index.ts            # Ponto de entrada
│   │   ├── consumer.ts         # Consumidor Kafka
│   │   ├── server.ts           # Servidor Express
│   │   └── database.ts         # Consultas MySQL
│   ├── api/balances.http       # Requisições prontas para executar
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── init/
│   ├── wallet/01-init.sql      # Schema + dados iniciais banco wallet
│   └── balances/
│       ├── 01-schema.sql       # Schema banco balances
│       └── 02-seeds.sql        # Dados iniciais banco balances
├── api/client.http             # Requisições Wallet Core
├── Dockerfile                  # Dockerfile Wallet Core
└── docker-compose.yaml         # Orquestração do ecossistema completo
```
