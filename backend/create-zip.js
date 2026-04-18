const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, 'backend_deploy.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log('Arquivo backend_deploy.zip criado com ' + archive.pointer() + ' bytes.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Add specific directories
archive.directory('dist/', 'dist');
archive.directory('__admin-ui/dist/', '__admin-ui/dist');
archive.directory('src/', 'src'); // included just in case

// Add specific files
archive.file('package.json', { name: 'package.json' });
archive.file('patch-vendure-ui.js', { name: 'patch-vendure-ui.js' });
if (fs.existsSync('vendure.sqlite')) {
    archive.file('vendure.sqlite', { name: 'vendure.sqlite' });
}
if (fs.existsSync('.env')) {
    archive.file('.env', { name: '.env' });
}

archive.finalize();