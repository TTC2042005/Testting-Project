# Jira Helper Scripts

This folder contains Jira integration helpers for running checks and posting comments back to Jira.

## Setup

1. Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

2. Fill in the Jira values:

- `JIRA_URL`: your Jira cloud URL
- `JIRA_EMAIL`: your Jira account email
- `JIRA_TOKEN`: your Jira API token
- `JIRA_ISSUE_KEY`: optional default issue key

## Scripts

From `d:\Project\Project_Template\jira`:

- `npm run jira:check`
  - Runs a Jira connectivity check.
- `npm run jira:comment -- --issue Test-2 --comment "Your message"`
  - Posts a comment to the specified Jira issue.
- `npm run check`
  - Alias for `npm run jira:check`.
- `npm run comment -- --issue Test-2 --comment "Your message"`
  - Alias for `npm run jira:comment`.

## Example commands

```powershell
cd d:\Project\Project_Template\jira
npm run jira:check
npm run jira:comment -- --issue Test-2 --comment "Test-2 failed during execution"
npm run test:record
```

## Real issue test flow

Use the following steps to run tests and report failures for the given issue keys.

1. Run the capture script to execute Jest and write output to artifacts:

```powershell
npm run test:record -- --issue Test-2
```

2. If the result fails, post a Jira comment with the failure details:

```powershell
npm run jira:comment -- --issue Test-2 --comment "Test-2 failed. See jira/artifacts/test-run-output.txt for details."
```

3. Replace `Test-2` with `Test-9` or `Test-11` to use those issue keys:

```powershell
npm run test:record -- --issue Test-9
npm run jira:comment -- --issue Test-9 --comment "Test-9 failed. See jira/artifacts/test-run-output.txt for details."
```

```powershell
npm run test:record -- --issue Test-11
npm run jira:comment -- --issue Test-11 --comment "Test-11 failed. See jira/artifacts/test-run-output.txt for details."
```

## Issue keys

Use one of the issue keys from your project tasks:

- `Test-2`
- `Test-9`
- `Test-11`

If `JIRA_ISSUE_KEY` is set in `.env`, you can omit `--issue` and use the default issue key.
