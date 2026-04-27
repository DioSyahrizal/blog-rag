# AGENT.md

## Project

`blog-rag` is a simple Blog RAG application with:
- `Vite + React` frontend
- `Fastify` backend
- `Postgres` as the source of truth
- `Qdrant` as the vector store
- `OpenAI` for embeddings and grounded answer generation

The product shape for v1 is:
- single-user admin
- create and manage blogs with `name`, `title`, `tags`, and rich text `content`
- save blogs as `draft` or `published`
- only published blogs are indexed and retrievable
- ask questions over published blogs and return an answer with citations/snippets

## Current Repo State

### Implemented

- Root workspace with npm workspaces for `apps/backend` and `apps/frontend`
- Docker Compose for local `postgres` and `qdrant`
- Backend:
  - DB initialization for the `blogs` table
  - blog CRUD endpoints
  - blog validation with `zod`
  - HTML-to-text conversion for indexing
  - async in-process indexing queue
  - paragraph-aware chunking with overlap
  - OpenAI embedding provider abstraction
  - Qdrant upsert, search, and delete integration
  - `/api/ask` retrieval endpoint with answer + citations
- Frontend:
  - admin sidebar with blog list
  - create/edit form for blog metadata
  - lightweight rich text editor
  - question input with optional tag filters
  - answer panel and citation list
- Tooling:
  - build passes
  - tests pass
  - `.env.example` included

### Verified

- `npm install` completed successfully
- `npm run build` completed successfully
- `npm run test` completed successfully
- Docker Compose starts `postgres` and `qdrant`
- backend health endpoint responded successfully
- draft blog create/list flow was smoke-tested through the live API

### Known Gaps

- Full publish/index/ask flow has not been live-verified with OpenAI because `.env` still needs a real `OPENAI_API_KEY`
- The current indexing worker is in-process only; it works for local/dev but is not durable across app restarts
- The editor uses `document.execCommand`, which is acceptable for a simple v1 but not ideal long term
- There is no auth, upload pipeline, or media handling
- Tests are focused and light; there are no integration tests against live Postgres/Qdrant yet

## Current Architecture

### Frontend

- `apps/frontend`
- Vite dev server on `5173`
- Proxies `/api` to backend on `3001`
- Main surfaces:
  - content admin
  - RAG question/answer panel

### Backend

- `apps/backend`
- Fastify server on `3001`
- Main modules:
  - `routes/blogs.ts`
  - `routes/ask.ts`
  - `services/content.ts`
  - `services/chunking.ts`
  - `services/embeddings.ts`
  - `services/qdrant.ts`
  - `services/indexing.ts`

### Data Flow

1. Admin saves blog
2. Backend validates payload and stores blog in Postgres
3. Backend derives `content_text` from `content_html`
4. Published blogs are marked `pending` and queued for indexing
5. Indexer chunks text, generates embeddings, and upserts chunks into Qdrant
6. Ask flow embeds the question, searches Qdrant, builds grounded context, and asks OpenAI for an answer
7. Response returns answer plus citations/snippets

## Important Conventions

- `name` is the blog slug-like unique identifier
- `content_html` is the display source of truth
- `content_text` is derived for indexing/search
- `status` is one of:
  - `draft`
  - `published`
- `index_status` is one of:
  - `idle`
  - `pending`
  - `processing`
  - `ready`
  - `failed`
- Draft blogs must never appear in retrieval results

## Local Runbook

### Prerequisites

- Node.js with npm
- Docker Desktop or compatible Docker engine
- OpenAI API key

### Setup

1. Copy `.env.example` to `.env`
2. Fill in `OPENAI_API_KEY`
3. Start infra:
   - `docker compose up -d`
4. Install dependencies:
   - `npm install`
5. Start backend:
   - `npm run dev:backend`
6. Start frontend:
   - `npm run dev:frontend`

### Useful URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`
- Qdrant: `http://localhost:6333`

## Next Plan

### Immediate next steps

1. Add a real `OPENAI_API_KEY` to `.env`
2. Live-test the full published blog flow:
   - create published blog
   - confirm indexing reaches `ready`
   - ask a matching question
   - verify citations/snippets
3. Add one or two integration tests for:
   - publish -> indexed
   - unpublish/delete -> removed from retrieval

### Recommended improvements

1. Replace the in-process queue with a more durable job mechanism
2. Replace `execCommand` editor with a maintained editor library
3. Add better error states and indexing-status refresh in the frontend
4. Add DB/Qdrant integration test coverage
5. Add auth if the app moves beyond single-user local/admin use

### Nice-to-have v1.1 ideas

- semantic blog search page
- preview page for blog rendering
- retry indexing action
- better citation grouping by source blog
- tag management UX

## Notes For Future Agents

- If retrieval errors mention Qdrant version mismatch, check `docker-compose.yml` and the installed `@qdrant/js-client-rest` version first
- If publish works but retrieval is weak, tune chunk size/overlap before redesigning the whole pipeline
- Keep Postgres as the system of record; Qdrant should stay derivable from Postgres content
- Avoid adding auth or media features unless explicitly requested; they are outside the current v1 scope
