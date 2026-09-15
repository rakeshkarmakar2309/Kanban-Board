# Orbit Kanban

A collaborative Kanban board built with React, Tailwind CSS, a small Node HTTP API, and `@dnd-kit`.

## Run

```bash
npm install
npm install --prefix frontend
npm start
npm run dev
```

Open `http://localhost:5173`. Copy `.env.example` to `.env` to change the backend or frontend ports. Set `frontend/.env` `VITE_API_URL` when the frontend must call a backend directly instead of using the Vite proxy.

## Architecture

- `backend/server.ts` stores tasks in memory and exposes CRUD endpoints plus an SSE stream at `/api/events`.
- `frontend/src/App.tsx` owns server state, URL-backed search/filter state, optimistic mutations, and the task modal.
- Dragging sends `status` and `position` patches for the affected column. A failed mutation restores the prior task list and shows a toast.
- Remote SSE events are applied incrementally. Task IDs currently being mutated locally are ignored until their request resolves, avoiding an in-flight overwrite.

The data intentionally resets when the backend restarts. Authentication, persistence, conflict versioning, and keyboard drag controls are deliberate timebox trade-offs.
