# LLM Typescript Codebase Embeddings

Parse and Load Typescript Codebase into Postges Vector DB which can be used as part of a RAG setup.

## Set up Instructions

### 1. Set up Docker environment

Create a `docker-compose.yml` file with the following content:

```yaml
services:
  timescaledb:
    image: timescale/timescaledb-ha:pg16
    container_name: timescaledb
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  timescaledb_data:
```

Run the Docker container:

```bash
docker compose up -d
```

### 2. Connect to the database using a PostgreSQL GUI client

- Open client
- Create a new connection with the following details:
  - Host: localhost
  - Port: 5432
  - User: postgres
  - Password: password
  - Database: postgres

### 3. Set up Ollama

Install ollama locally or point to a managed ollama instance by setting OLLAMA_BASE_URL in the [example.env](example/.env).

1. Optional if ollama is different than http://127.0.0.1:11434/:

```bash
cp example.env .env
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
npm ci
```

## Usage

### Index Codebase

```bash
npm run insert /path-to-codebase
```

### Search Indexed Codebase from Database for Relevent Documents

```bash
npm run search "complicated function"
```

### Use AI to Generate Response from Search Results

```bash
npm run ai-search "What's an LLM"
```

### Start Web Server

```bash
npm start
```

Then load a search using: http://localhost:3000/ai-search?searchText=what%20is%20an%20llm&dbResultLimit=5.

#### View Swagger Docs

[![Swagger Docs](swagger.png)](http://localhost:3000/docs)

Swagger docs are available here: **http://localhost:3000/docs**.
