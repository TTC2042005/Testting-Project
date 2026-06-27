@echo off
setlocal
cd /d "%~dp0"
if not exist artifacts mkdir artifacts
node -e "const {spawnSync}=require('child_process'); const fs=require('fs'); const path=require('path'); const res=spawnSync(process.execPath,['./node_modules/jest/bin/jest.js','--runInBand'],{cwd:process.cwd(),encoding:'utf8'}); fs.writeFileSync(path.resolve('artifacts/test-run-output.txt'), JSON.stringify({status:res.status, stdout:res.stdout, stderr:res.stderr}, null, 2)); console.log('WROTE', path.resolve('artifacts/test-run-output.txt'));"