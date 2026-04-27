# Blog RAG

Simple Blog RAG app with:
- Vite + React frontend
- Fastify backend
- Postgres source of truth
- Qdrant vector store
- OpenAI embeddings and answer generation

## Run

1. Copy `.env.example` to `.env`.
2. Start infrastructure:
   - `docker compose up -d`
3. Install dependencies:
   - `npm install`
4. Start backend:
   - `npm run dev:backend`
5. Start frontend:
   - `npm run dev:frontend`

Frontend runs on `http://localhost:5173`.
Backend runs on `http://localhost:3001`.
