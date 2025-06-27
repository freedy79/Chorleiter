const { spawn } = require('child_process');

const child = spawn('npx', ['ng', 'serve'], { stdio: ['inherit', 'pipe', 'pipe'] });

function logWithTimestamp(prefix) {
  return data => {
    data.toString().split(/\r?\n/).forEach(line => {
      if (line.trim() !== '') {
        console.log(`[${new Date().toLocaleTimeString()}] ${prefix}${line}`);
      }
    });
  };
}

child.stdout.on('data', logWithTimestamp(''));
child.stderr.on('data', logWithTimestamp('ERR: '));

child.on('close', code => {
  console.log(`ng serve exited with code ${code}`);
});
