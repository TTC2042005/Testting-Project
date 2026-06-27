// Issue key: Test-2
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

jest.mock('../jira-report', () => {
  const actual = jest.requireActual('../jira-report');
  return {
    loadEnv: jest.fn(),
    postFailureToJira: jest.fn(),
    resolveIssueKey: actual.resolveIssueKey,
  };
});

const { postFailureToJira, resolveIssueKey } = require('../jira-report');

describe('write-test-results.js', () => {
  let originalArgv;

  beforeEach(() => {
    originalArgv = process.argv;
    jest.resetModules();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  test('Issue key: Test-2 - writes Jest output to artifacts/test-run-output.txt when Jest succeeds', async () => {
    process.argv = ['node', 'write-test-results.js'];
    resolveIssueKey.mockReturnValue('Test-2');

    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const spawnSpy = jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: 'Jest run successful\n',
      stderr: '',
    });

    await jest.isolateModulesAsync(async () => {
      const { run } = require('../write-test-results.js');
      await run(process.argv);
    });

    const expectedArtifactPath = path.resolve(__dirname, '../artifacts/test-run-output.txt');
    const expectedJestPath = path.resolve(__dirname, '../node_modules/jest/bin/jest.js');

    expect(mkdirSpy).toHaveBeenCalledWith(path.resolve(__dirname, '../artifacts'), { recursive: true });
    expect(spawnSpy).toHaveBeenCalledWith(process.execPath, [expectedJestPath, '--runInBand'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      shell: false,
      env: process.env,
    });
    expect(writeSpy).toHaveBeenCalledWith(
      expectedArtifactPath,
      JSON.stringify({
        status: 0,
        stdout: 'Jest run successful\n',
        stderr: '',
      }, null, 2),
      'utf8'
    );
    expect(console.log).toHaveBeenCalledWith('WROTE', expectedArtifactPath);
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('Issue key: Test-2 - writes Jest failure output and reports Jira failure when Jest fails', async () => {
    process.argv = ['node', 'write-test-results.js', '--issue', 'Test-2'];
    resolveIssueKey.mockReturnValue('Test-2');

    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(childProcess, 'spawnSync').mockReturnValue({
      status: 1,
      stdout: '',
      stderr: 'Jest failed with errors\n',
    });
    postFailureToJira.mockResolvedValue({ ok: true, skipped: false, result: { comment: 'added' } });

    await jest.isolateModulesAsync(async () => {
      const { run } = require('../write-test-results.js');
      await run(process.argv);
    });

    const expectedArtifactPath = path.resolve(__dirname, '../artifacts/test-run-output.txt');

    expect(mkdirSpy).toHaveBeenCalledWith(path.resolve(__dirname, '../artifacts'), { recursive: true });
    expect(writeSpy).toHaveBeenCalledWith(
      expectedArtifactPath,
      JSON.stringify({
        status: 1,
        stdout: '',
        stderr: 'Jest failed with errors\n',
      }, null, 2),
      'utf8'
    );
    expect(postFailureToJira).toHaveBeenCalledWith({
      issueKey: 'Test-2',
      command: 'node write-test-results.js',
      exitCode: 1,
      output: 'Jest failed with errors\n',
    });
    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
