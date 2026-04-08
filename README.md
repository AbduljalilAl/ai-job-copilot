# AI Job Copilot

AI Job Copilot is a monorepo MVP for internship and summer training applications. It accepts a master resume, compares it against a pasted opportunity description, stores the result, and shows fit insights in a simple dashboard.

## Folder structure

```text
apps/
  api/          Express + TypeScript + Prisma
  web/          React + Vite + TypeScript
packages/
  shared/       Shared types and contracts
```

## Backend overview

- `POST /resume/upload`
  - multipart form-data
  - field name: `resume`
- `POST /job/analyze`
  - JSON body: `{ "jobText": "...", "resumeId": 1 }`

The API stores:

- resume filename and extracted text
- job description text
- score, matched skills, missing skills, suggestions
- tailored summary and short cover letter draft

## Prisma models

- `Resume`
  - `id`
  - `filename`
  - `content`
  - `createdAt`
- `JobAnalysis`
  - `id`
  - `jobText`
  - `score`
  - `matchedSkills`
  - `missingSkills`
  - `suggestions`
  - `tailoredSummary`
  - `coverLetter`
  - `createdAt`
  - `resumeId`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` in the repo root and update values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_job_copilot?schema=public"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
VITE_API_BASE_URL="http://localhost:4000"
```

3. Generate Prisma client and run the first migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. Start the API and web app in separate terminals:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

## MVP behavior

- Resume parsing supports PDF and DOCX
- Matching is keyword-based for simplicity
- `AIService` is modular and deterministic for now, so it can be replaced later with OpenAI or another provider
- This is explicitly human-in-the-loop and does not auto-apply to jobs

## Suggested next steps

- Add authentication and user ownership
- Add tests for parsing, matching, and API routes
- Replace the placeholder AI generation layer with a real provider
- Add richer resume and job parsing beyond keyword matching
