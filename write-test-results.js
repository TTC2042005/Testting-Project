const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadEnv, postFailureToJira, resolveIssueKey } = require('./jira-report');

const artifactsPath = path.resolve(__dirname, 'artifacts');
const outputFile = path.resolve(artifactsPath, 'test-run-output.txt');

const writeResult = (result) => {
  fs.mkdirSync(artifactsPath, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
  console.log('WROTE', outputFile);
};

const run = async (argv = process.argv) => {
  loadEnv();

  const args = argv.slice(2);
  const issueKey = resolveIssueKey(args, process.env);

  const result = spawnSync(process.execPath, [path.resolve(__dirname, 'node_modules/jest/bin/jest.js'), '--runInBand'], {
    cwd: __dirname,
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const resultData = {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };

  writeResult(resultData);

  if (result.status !== 0) {
    const failureMessage = output || `Jest exited with status ${result.status}`;
    let jiraReport = { ok: false, skipped: true, reason: 'No Jira issue key provided' };

    if (issueKey) {
      try {
        jiraReport = await postFailureToJira({
          issueKey,
          command: `node ${path.basename(__filename)}`,
          exitCode: result.status || 1,
          output: failureMessage,
        });
      } catch (error) {
        jiraReport = { ok: false, skipped: false, reason: error.message };
      }
    }

    console.error('TEST FAILURE: Jest tests failed.');
    console.error(JSON.stringify({
      ok: false,
      issueKey: issueKey || null,
      output: failureMessage,
      jiraReport,
    }, null, 2));
    process.exit(result.status || 1);
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  });
}

module.exports = { run, artifactsPath, outputFile };
