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
- Analysis history for reviewing recent saved results
- Automated job discovery across built-in Greenhouse and Lever source registries, plus safe mock fallback for local development
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
7. Every analysis is saved and can be retrieved later from `GET /analysis/history`.
8. The AI layer does not rewrite or replace the resume.
9. If OpenAI is unavailable, the backend keeps the analysis usable and returns a safe AI error state for the frontend.

## How job discovery works

1. The frontend sends job search preferences to `POST /jobs/search`.
2. A provider layer automatically searches curated public Greenhouse and Lever sources. You can optionally append more sources through `GREENHOUSE_BOARD_TOKENS` and `LEVER_COMPANY_TOKENS`.
3. If the user leaves the search form mostly blank, the backend derives a search profile from the latest uploaded resume.
4. The backend normalizes job data, filters obvious mismatches using the search preferences, and then scores every remaining opportunity against the latest uploaded resume.
5. Each opportunity is scored using the same `MatchingService`, with additional weighting for:
   - required technical skills
   - optional technical skills
   - soft skills
   - role relevance
6. The discovery pipeline now filters out obvious role-family mismatches such as sales or customer-success roles when the resume is targeting software, networking, cloud, embedded, QA, or data tracks.
7. Senior-only roles are heavily penalized or excluded for internship and training-focused profiles.
8. The strongest jobs receive an optional AI fit refinement on top of the deterministic baseline, which can slightly adjust the score and improve the explanation without replacing the core rules.
9. Scored opportunities are ranked best-first and persisted in `JobOpportunity`.
10. If the user does not provide a location, Saudi Arabia opportunities and remote roles are ranked ahead of otherwise similar global matches.
11. The frontend can list stored opportunities from `GET /jobs` and open full details from `GET /jobs/:id`.
12. Running a full analysis from a job details page reuses `POST /job/analyze`, which saves the opportunity into the existing history and tracking flow.
13. Location-country inference now uses a seeded `GeoLocation` database table plus explicit remote/global handling. OpenAI is not used for location inference.

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
  - `companyName`
  - `jobTitle`
  - `sourceUrl`
  - `status`
  - `notes`
  - `score`
  - `matchedSkills`
  - `missingSkills`
  - `suggestions`
  - `tailoredSummary`
  - `coverLetter`
  - `applicationTips`
  - `createdAt`
  - `savedAt`
  - `updatedAt`
  - `resumeId`
- `JobOpportunity`
  - `id`
  - `title`
  - `companyName`
  - `location`
  - `source`
  - `sourceUrl`
  - `applyUrl`
  - `description`
  - `employmentType`
  - `roleType`
  - `remoteType`
  - `matchScore`
  - `matchedSkills`
  - `missingSkills`
  - `matchReason`
  - `matchDetails`
  - `createdAt`
  - `updatedAt`
- `GeoLocation`
  - `geonameId`
  - `cityName`
  - `asciiName`
  - `normalizedCityName`
  - `countryCode`
  - `countryName`
  - `normalizedCountryName`
  - `admin1Code`
  - `normalizedAdmin1Code`
  - `latitude`
  - `longitude`
  - `population`
  - `timezone`
  - `sourceDataset`

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
JOB_DISCOVERY_PROVIDER="auto"
GREENHOUSE_BOARD_TOKENS=""
LEVER_COMPANY_TOKENS=""
GEOLOCATION_CITIES_DATA_URL=""
GEOLOCATION_COUNTRY_INFO_URL=""
```

Use your Neon connection string for `DATABASE_URL`. Do not commit `.env` or real secrets. The repository ignores `.env` and `.env.*`, while keeping `.env.example` committed as a safe template.

`JOB_DISCOVERY_PROVIDER` supports:

- `auto`: search the built-in Greenhouse board registry and use mock jobs only if discovery fails
- `structured`: require the built-in structured providers and skip the mock-only mode
- `greenhouse`: require Greenhouse discovery and skip the mock-only mode
- `mock`: force local mock jobs

`GREENHOUSE_BOARD_TOKENS` accepts a comma-separated list of extra public Greenhouse board tokens.
`LEVER_COMPANY_TOKENS` accepts a comma-separated list of extra public Lever company tokens.
Both are optional because the app now includes built-in registries for automated discovery.
`GEOLOCATION_CITIES_DATA_URL` and `GEOLOCATION_COUNTRY_INFO_URL` are optional overrides for the geolocation seed script. Leave them blank to use the default public dataset URLs.

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

Prisma reads `DATABASE_URL` from your local `.env`, so Neon credentials stay out of source control. The latest code adds `JobOpportunity` for job discovery and tracking, so run a new migration after pulling the latest code.

5. Seed the geolocation reference table:

```bash
npm run geo:seed
```

This imports city-country reference data into `GeoLocation` from a public GeoNames dataset mirror. The app uses that table for location-country resolution, while remote/global values such as `Remote`, `Anywhere`, and `Worldwide` are handled explicitly in code instead of being stored as cities.
The default seed uses:
- a GitHub raw mirror of the GeoNames `cities15000` dataset for city rows
- the official GeoNames `countryInfo.txt` file for country names

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
- optional top-job fit refinement

`OPENAI_MODEL` is optional. If it is not set, the API defaults to `gpt-5-mini`.

These outputs are constrained to the uploaded resume and the pasted role description. The app should not invent experience or replace the user's resume.
OpenAI is not used for city-country lookup anymore.

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

## Testing job discovery and scoring

1. Leave `JOB_DISCOVERY_PROVIDER=auto` for automated discovery. Optionally add extra Greenhouse or Lever tokens to `.env` if you want to search more companies than the built-in registries.
2. Run the latest Prisma migration, generate the client, and seed geolocation data:

```bash
npm run prisma:migrate -- --name add-job-opportunities
npm run prisma:generate
npm run geo:seed
```

3. Start the API and web app.
4. Upload a resume first.
5. Open the Jobs page and click discovery with the form blank, or add only small hints like location or remote-only preference.
6. Confirm the results list shows:
   - company name
   - job title
   - location
   - match score
   - short match reason
   - apply link when available
   - structured source information when discovery succeeds, otherwise mock source
   - fewer unrelated commercial roles such as sales and account-executive jobs
7. Open a job details page and confirm it shows:
   - full description
   - matched required, optional, and soft skills
   - missing required, optional, and soft skills
   - role-fit summary and detected seniority
   - AI fit summary when OpenAI refinement is available
   - apply link or a clear fallback message
8. Run full analysis from the details page and confirm the result appears in the existing Results and History flows.

## Notes

- Recent schema changes include richer `JobAnalysis` tracking fields and the new `JobOpportunity` model.
- This upgrade adds `OPENAI_API_KEY` and optional `OPENAI_MODEL`.
- `AIService` still remains isolated behind the existing service boundary.
