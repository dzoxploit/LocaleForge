# LocaleForge MVP

LocaleForge is a developer productivity tool for finding missing, inconsistent, and unused translation keys across multilingual locale files.

This repository currently contains a dependency-free browser MVP. Open `index.html` to use it.

## What the MVP Does

- Loads nested JSON locale files from the browser.
- Compares every locale and reports missing translation keys.
- Detects schema/type mismatches across nested locale structures.
- Scans pasted or uploaded source code for translation references such as `t("login.button")`, `i18n.t("...")`, `$t("...")`, and `formatMessage({ id: "..." })`.
- Reports source-locale keys that are not referenced by the application source.
- Shows per-locale completeness percentages.
- Exports a JSON validation report that can later power CI checks.
- Generates lightweight draft suggestions for common missing values.

## Run Locally

Open this file in a browser:

```text
C:\Users\didin\Documents\LocaleForge\index.html
```

No install step is required for the MVP.

## Deploy To Vercel

This MVP is configured as a static Vercel project with `vercel.json`.

With an authenticated Vercel CLI session:

```bash
vercel deploy --prod --yes
```

For non-interactive deployment, create a Vercel token and run:

```bash
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Sample Case

`examples/en.json`

```json
{
  "login": {
    "title": "Welcome",
    "button": "Login"
  }
}
```

`examples/id.json`

```json
{
  "login": {
    "title": "Selamat Datang"
  }
}
```

LocaleForge reports `login.button` as missing from `id`.

## Product Direction

The next production version can split this MVP into:

- `apps/web`: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui.
- `apps/api`: NestJS or Laravel API for projects, scan history, teams, and billing.
- `packages/analyzer`: shared locale parsing and report generation.
- `packages/cli`: CI/CD validation command for GitHub Actions, GitLab CI, and Jenkins.
- `infra`: Docker, PostgreSQL, Redis, and deployment configuration.

## Suggested Next Milestones

1. Extract the analyzer into a tested TypeScript package.
2. Add a CLI command: `localeforge scan --locales ./locales --source ./src`.
3. Add project persistence and scan history.
4. Connect a real AI translation provider for missing-key suggestions.
5. Add CI output formats: JSON, SARIF, Markdown, and terminal table.
