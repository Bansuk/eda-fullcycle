# EDA Fullcycle – Wallet Core + Balances Service

Event-Driven Architecture demo built with **Go** (Wallet Core producer) and **TypeScript** (Balances consumer), connected via **Apache Kafka**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Docker Network                                                      │
│                                                                     │
│  ┌────────────┐   POST /transactions   ┌──────────────────────────┐ │
│  │   Client   │ ──────────────────────▶│  Wallet Core (Go :8080)  │ │
│  └────────────┘                        │  MySQL: wallet DB        │ │
│                                        └──────────┬───────────────┘ │
│                                                   │ BalanceUpdated  │
│                                                   ▼                 │
│                                        ┌──────────────────────────┐ │
│                                        │   Kafka topic: balances  │ │
│                                        └──────────┬───────────────┘ │
│                                                   │                 │
│                                                   ▼                 │
│  ┌────────────┐  GET /balances/{id}   ┌──────────────────────────┐  │
│  │   Client   │ ◀─────────────────── │ Balances Service (TS     │  │
│  └────────────┘                       │ :3003) MySQL: balances DB│  │
│                                       └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Services

| Service          | Technology | Port | Description                             |
| ---------------- | ---------- | ---- | --------------------------------------- |
| `goapp`          | Go         | 8080 | Wallet Core – REST API + Kafka producer |
| `mysql`          | MySQL 5.7  | 3306 | Wallet Core database                    |
| `balances`       | TypeScript | 3003 | Balances Service – Kafka consumer + API |
| `balances-mysql` | MySQL 5.7  | 3307 | Balances Service database               |
| `kafka`          | Confluent  | 9092 | Message broker                          |
| `zookeeper`      | Confluent  | 2181 | Kafka coordinator                       |
| `control-center` | Confluent  | 9021 | Kafka UI                                |

---

## Kafka Topics

| Topic          | Producer    | Consumer         | Payload                                                     |
| -------------- | ----------- | ---------------- | ----------------------------------------------------------- |
| `transactions` | Wallet Core | —                | `TransactionCreated` event                                  |
| `balances`     | Wallet Core | Balances Service | `BalanceUpdated` event with `account_id_from/to` + balances |

### `BalanceUpdated` message format (topic: `balances`)

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

## Quick Start

### Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2

### 1. Start the entire ecosystem

```bash
docker compose up -d
```

This single command will:

- Start Zookeeper + Kafka + Confluent Control Center
- Start both MySQL databases (wallet and balances)
- Run SQL init scripts: schema + seed data for both databases (first run only)
- Build and start the Go Wallet Core app on `:8080`
- Build and start the TypeScript Balances Service on `:3003`

> **First-run note:** The Go app compiles inside the container on first start, which can take ~30–60 s. Wait for the log `Server is running` before sending requests.

### 2. Verify services are up

```bash
docker compose ps
```

---

## Seed Data

Both databases are pre-populated on first start:

### Wallet Core (`wallet` DB)

| Entity  | ID                                     | Name        | Balance |
| ------- | -------------------------------------- | ----------- | ------- |
| Client  | `f4a498a7-5f0c-4ead-8f3b-d5a48264a2b1` | Alice Smith | —       |
| Client  | `8b38afc4-1e47-4f9d-a2f5-ef12dc0c3c34` | Bob Jones   | —       |
| Account | `f8df753c-3b58-43aa-8016-12aaa4f1ea3e` | Alice       | 1000.00 |
| Account | `0216ea38-524f-4e85-8743-d484a8f7538e` | Bob         | 500.00  |

### Balances Service (`balances` DB)

Same account IDs are pre-seeded with matching initial balances.

---

## API Reference

### Wallet Core (`http://localhost:8080`)

| Method | Path            | Description              |
| ------ | --------------- | ------------------------ |
| POST   | `/clients`      | Create a new client      |
| POST   | `/accounts`     | Create a new account     |
| POST   | `/transactions` | Create a new transaction |

See [api/client.http](api/client.http) for ready-to-run requests.

### Balances Service (`http://localhost:3003`)

| Method | Path                     | Description                 |
| ------ | ------------------------ | --------------------------- |
| GET    | `/balances/{account_id}` | Get current account balance |

See [balances/api/balances.http](balances/api/balances.http) for ready-to-run requests.

#### Example

```bash
# Check Alice's balance (seeded at 1000.00)
curl http://localhost:3003/balances/f8df753c-3b58-43aa-8016-12aaa4f1ea3e
```

```json
{
	"account_id": "f8df753c-3b58-43aa-8016-12aaa4f1ea3e",
	"balance": 1000,
	"updated_at": "2026-03-11T00:00:00.000Z"
}
```

```bash
# Create a transaction (Alice → Bob, 100 units)
curl -X POST http://localhost:8080/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "account_id_from": "f8df753c-3b58-43aa-8016-12aaa4f1ea3e",
    "account_id_to":   "0216ea38-524f-4e85-8743-d484a8f7538e",
    "amount": 100
  }'
```

After the transaction, check Alice's balance again — it will be updated to `900` by the Balances Service automatically via Kafka.

---

## Development

### Resetting data volumes (clean slate)

The MySQL init scripts run **only when the data volume is empty**. To reset:

```bash
docker compose down -v
sudo rm -rf .docker/mysql .docker/balances-mysql
docker compose up -d
```

### Kafka UI

Open [http://localhost:9021](http://localhost:9021) to inspect topics and messages in Confluent Control Center.

### Logs

```bash
# Follow all service logs
docker compose logs -f

# Follow only the balances service
docker compose logs -f balances
```

---

## Project Structure

```
.
├── cmd/walletcore/main.go       # Wallet Core entry point
├── internal/                   # Go domain layer
│   ├── entity/                 # Domain entities
│   ├── usecase/                # Application use cases
│   ├── event/                  # Domain events + Kafka handlers
│   ├── database/               # MySQL repositories
│   ├── gateway/                # Repository interfaces
│   └── web/                    # HTTP handlers
├── pkg/                        # Shared Go packages
│   ├── events/                 # Event dispatcher
│   ├── kafka/                  # Kafka producer/consumer
│   └── uow/                    # Unit of Work
├── balances/                   # Balances microservice (TypeScript)
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── consumer.ts         # Kafka consumer
│   │   ├── server.ts           # Express HTTP server
│   │   └── database.ts         # MySQL queries
│   ├── api/balances.http       # Ready-to-run HTTP requests
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── init/
│   ├── wallet/01-init.sql      # Wallet DB schema + seeds
│   └── balances/
│       ├── 01-schema.sql       # Balances DB schema
│       └── 02-seeds.sql        # Balances DB seeds
├── api/client.http             # Wallet Core HTTP requests
├── Dockerfile                  # Wallet Core Dockerfile
└── docker-compose.yaml         # Full ecosystem orchestration
```
