# DataPilot Public Demo

DataPilot is a portfolio-ready e-commerce data analysis agent demo built with Vite, React, TypeScript and Recharts. It turns business questions into structured KPI cards, trends, comparisons, detail tables, diagnoses and recommended actions.

## Safety and data boundary

- All names, identifiers and numeric values are fictional.
- All datasets and knowledge entries are bundled locally in the repository.
- The app does not connect to company systems, internal SDKs, external agents, databases or authenticated APIs.
- Unsupported data questions return an explicit coverage-gap message instead of fabricated numbers.

## Product capabilities

- Six deterministic analysis scenarios: budget, channel GMV, product hunting, weekly review, seller performance and category performance.
- Natural-language routing for metric definitions, GMV diagnosis, local dataset analysis and out-of-scope questions.
- Rich analysis output with visible chart values, KPI cards, comparison bars, detail tables and action recommendations.
- Resource hub with local interactive previews.
- Download center with synthetic sample files.
- Responsive desktop, tablet and mobile layouts.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3005`.

## Production build

```bash
npm run build
npm run preview
```

## Project structure

```text
src/App.tsx                         Local question routing and rich analysis UI
src/lib/analysisResult.ts           Deterministic report builders
src/lib/dataAsset.ts                Dataset coverage and fallback logic
src/knowledge/public-demo-data.json Fully synthetic local datasets
src/knowledge/public-demo-knowledge.json Generic metric and analysis knowledge
src/legacy/                         Resource hub and fixed scenario previews
src/assets/downloads/               Synthetic downloadable samples
```

## Deployment

This is a standard Vite static application. The repository includes `vercel.json`, so Vercel can detect the Vite framework, run `npm ci` and `npm run build`, publish `dist/`, and route browser requests back to `index.html`.

### Deploy with GitHub and Vercel

1. Upload the complete project to the root of a GitHub repository. The repository root must contain `package.json`, `index.html`, `vite.config.ts`, `vercel.json`, and the `src/` directory.
2. In Vercel, choose **Add New → Project** and import that GitHub repository.
3. Keep **Root Directory** as `./` when the files are in the repository root. If GitHub contains an extra parent folder, select that folder as the Root Directory.
4. Use **Framework Preset: Vite**, **Build Command: npm run build**, and **Output Directory: dist**. The included `vercel.json` already supplies these values.
5. After deployment succeeds, open the **Production** URL shown under Vercel Domains. Do not reuse a deleted or expired preview-deployment URL.

If Vercel shows a generic `This page doesn't exist` screen, first confirm that the project has a successful Production deployment and that the URL matches the current domain. A build failure appears in the deployment logs instead; a generic Vercel 404 usually means the domain or deployment URL is missing, deleted, or not linked to the current project.

## Disclaimer

This project demonstrates product design, data reasoning, trustworthy answer boundaries and frontend implementation. Its outputs are for portfolio demonstration only and do not represent real business performance.
