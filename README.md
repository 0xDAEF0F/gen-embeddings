# LLM Typescript Codebase Embeddings

Parse and Load Typescript Codebase into Postges Vector DB which can be used as part of a RAG setup.

## Quick Start

Add your custom text documents to the [code](code) directory.
This will run everything if you want to avoid having to install node/postgres/ollama.

```bash
# Run database
docker compose up
```

## Manual Set up Instructions

### 1. Set up Docker environment

Choose on of the following docker compose files based on your preferences:

| File                      | Description                                     |
| ------------------------- | ----------------------------------------------- |
| docker-compose.yml        | Runs the postgres db                            |


Run the Docker container(s):

```bash
# Run just the app/db
docker compose -f docker-compose-app-db.yml up

# Run just the db
docker compose -f docker-compose-db.yml up

# Run just the app
docker compose -f docker-compose-app.yml up
```

### 2. Connect to the database using a PostgreSQL GUI client

- Open client
- Create a new connection with the following details:
  - Host: localhost
  - Port: 5432
  - User: postgres
  - Password: password
  - Database: postgres

### 3. Set up Ollama and Configure Env Vars

Install ollama locally or point to a managed ollama instance by setting OLLAMA_BASE_URL in the [example.env](example/.env).

1. Optional if ollama is different than http://127.0.0.1:11434/ or have different postgres url, etc:

```bash
cp example.env .env
```

**Example .env**
```
TIMESCALE_SERVICE_URL=postgres://postgres:password@127.0.0.1:5432/postgres
VECTOR_DATABASE_EMBEDDING_TABLE_NAME=code_chunks
VECTOR_DATABASE_EMBEDDING_DIMENSIONS=1024

# Uses https://github.com/jparkerweb/semantic-chunking when true and langchain/document_loaders/fs/text when false.
USE_SEMANTIC_CHUNKING=false

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=llama3.2

# If this is changed, the VECTOR_DATABASE_EMBEDDING_DIMENSIONS may also need to be updated.
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large

WEBSERVER_HOST=localhost
WEBSERVER_PORT=3000
```

2. For linux based on the env config docs described [here](https://github.com/ollama/ollama/blob/main/docs/faq.md#setting-environment-variables-on-linux
) edit /etc/systemd/system/ollama.service.d/override.conf or make sure the env vars are set, OLLAMA_HOST=0.0.0.0 and OLLAMA_ORIGINS=*:

```
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_ORIGINS=*"

systemctl daemon-reload
systemctl restart ollama
```

3. Make sure ollama is running on http://127.0.0.1:11434/ (or by loading OLLAMA_BASE_URL), should return:

```
Ollama is running
```

4. Finally load the following models:

```bash
ollama pull llama3.2
ollama pull mxbai-embed-large
```

### 4. Install Node Depdencies

```bash
bun ci
```

## Usage

### Index Typescript Codebase

```bash
bun run insert-codebase /path-to-codebase
```

### Search Indexed Database for Relevent Documents

```bash
bun run search "how to instantiate a thirdweb wallet"
```

### Run Web Server in Dev Mode

```bash
bun run dev
```

### Build Web Server

```bash
bun run build
```

### Start Web Server

```bash
bun run start
```

## System Overview

```mermaid
sequenceDiagram
    actor U as User
    actor AU as Admin User
    participant WS as Webserver or Script
    participant LE as LLM (Embeddings)
    participant PG as Postgres (pgvector)
    participant LG as LLM (Generation)

    Note over AU, PG: Admin Document Ingestion
    AU ->> WS: Upload document
    WS ->> LE: Generate Document Embeddings
    LE -->> WS: Document Embedding Vectors
    WS ->> PG: Store Document Embeddings
    PG ->> WS: Document Storage Success and ID
    WS -->> AU: Document Storage Success Message

    Note over U, LG: User Query
    U ->> WS: User Query
    WS ->> LG: Generate Embedding Based on Query Text
    LG -->> WS: Query Embedding
    WS ->> PG: Similarity Search (Query Embedding)
    PG -->> WS: Relevant Context (from other tables)
    WS -->> LG: Query + Context
    LG -->> U: Generated Response
```
