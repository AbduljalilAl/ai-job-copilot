# AI Job Copilot

AI Job Copilot is a monorepo MVP for internship and summer training applications. It lets a user upload a master resume, paste a job or training description, run a deterministic fit analysis, and review the result in a typed React dashboard.

## Structure

```text
apps/
  api/          Express + TypeScript + Prisma
  web/          React + Vite + TypeScript
packages/
  shared/       Shared API and analysis types
```

## Current features

- Resume upload with PDF and DOCX support
- Text extraction, cleaning, and persistence through Prisma
- Safe temporary file cleanup after parsing
- Job description analysis with:
  - overall score
  - matched technical skills
  - missing technical skills
  - matched soft skills
  - missing soft skills
  - suggested improvements
  - tailored summary
  - short cover letter draft
- Typed frontend state with localStorage restore for the current resume, latest job text, and latest analysis
- OpenAI-powered grounded application assistance for:
  - short cover letter
  - practical application tips
- Human-in-the-loop workflow only, with no auto-apply behavior
- The app does not generate, rewrite, or replace the user's resume. The uploaded resume remains the source of truth.

## How upload and parsing works

1. The frontend uploads a resume as multipart form-data to `POST /resume/upload`.
2. Multer stores the file temporarily in `apps/api/uploads`.
3. `ResumeParserService` extracts text from:
   - PDF files with `pdf-parse`
   - DOCX files with `mammoth`
4. Extracted text is cleaned by:
   - normalizing whitespace
   - collapsing repeated blank lines
   - trimming noisy characters
5. The parsed content is stored in the `Resume` table.
6. The temporary uploaded file is deleted whether parsing succeeds or fails.

## How analysis works

1. The frontend sends a job description to `POST /job/analyze`.
2. The backend validates the payload and resolves the selected or latest resume.
3. `MatchingService` normalizes text and common variants such as:
   - `nodejs` to `node.js`
   - `postgres` to `postgresql`
   - `js` to `javascript`
   - `ts` to `typescript`
4. The matching engine detects technical skills and soft skills separately.
5. The result is stored in `JobAnalysis` using JSON buckets for matched and missing skills.
6. `AIService` uses the OpenAI API to generate a grounded short cover letter and short application tips from:
   - the uploaded resume text
   - the pasted job or training description
7. The AI layer does not rewrite or replace the resume.
8. If OpenAI is unavailable, the backend keeps the analysis usable and returns a safe AI error state for the frontend.

## Error handling

The API returns a consistent error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": ["Job description must be at least 30 characters long."]
  }
}
```

Handled cases include:

- invalid file type
- file too large
- missing resume upload
- invalid job text
- missing latest resume
- resume id not found
- resume parsing failure
- OpenAI failures without crashing the analysis endpoint

## Database

Prisma models live in [apps/api/prisma/schema.prisma](./apps/api/prisma/schema.prisma).

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
  - `applicationTips`
  - `createdAt`
  - `resumeId`

## Setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Copy `.env.example` to `.env` and update the values locally:

```env
DATABASE_URL="your_database_url_here"
OPENAI_API_KEY="your_api_key_here"
OPENAI_MODEL="gpt-5-mini"
```

Use your Neon connection string for `DATABASE_URL`. Do not commit `.env` or real secrets. The repository ignores `.env` and `.env.*`, while keeping `.env.example` committed as a safe template.

For this monorepo, the primary local env file location is the repo root:

```text
ai-job-copilot/.env
```

If you run API-only commands directly from `apps/api`, you can also copy:

```text
apps/api/.env.example
```

to:

```text
apps/api/.env
```

using the same placeholder values replaced with your real local secrets.

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run migrations:

```bash
npm run prisma:migrate -- --name init
```

Prisma reads `DATABASE_URL` from your local `.env`, so Neon credentials stay out of source control. Because `applicationTips` was added to `JobAnalysis`, you need to run this migration after pulling the latest code.

## Start the apps

Run the API:

```bash
npm run dev:api
```

Run the web app in a separate terminal:

```bash
npm run dev:web
```

## AI features

When `OPENAI_API_KEY` is set, the app enables:

- grounded cover letter generation
- practical application tips

`OPENAI_MODEL` is optional. If it is not set, the API defaults to `gpt-5-mini`.

These outputs are constrained to the uploaded resume and the pasted role description. The app should not invent experience or replace the user's resume.

If OpenAI fails or is not configured, the app still returns the non-AI analysis and shows an AI error state for the AI sections.

## Testing cover letter generation

1. Create `.env` locally from `.env.example`.
2. Set `DATABASE_URL` to your Neon PostgreSQL connection string.
3. Add a valid `OPENAI_API_KEY` to `.env`.
4. Optionally set `OPENAI_MODEL` in `.env`. If omitted, the API uses `gpt-5-mini`.
5. Run:

```bash
npm run prisma:migrate -- --name add-application-tips
npm run dev:api
npm run dev:web
```

6. Upload a real PDF or DOCX resume.
7. Paste an internship or summer training description.
8. Submit the analysis and confirm:
   - a cover letter appears
   - application tips appear
   - the content stays grounded in the uploaded resume
   - no invented projects or achievements appear
9. Temporarily remove `OPENAI_API_KEY` and repeat to confirm the AI sections show an error state while the rest of the analysis still works.

## Notes

- This upgrade adds one schema change: `applicationTips` on `JobAnalysis`.
- This upgrade adds `OPENAI_API_KEY` and optional `OPENAI_MODEL`.
- `AIService` still remains isolated behind the existing service boundary.
