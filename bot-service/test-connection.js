const https = require('https');

console.log('Testing connection to api.telegram.org with https module...');

const req = https.request('https://api.telegram.org', { method: 'HEAD', timeout: 5000 }, (res) => {
    console.log(`HTTPS STATUS: ${res.statusCode}`);
});

req.on('error', (e) => {
    console.error('HTTPS Error:', e);
});

req.on('timeout', () => {
    console.error('HTTPS Timeout');
    req.destroy();
});

req.end();

if (global.fetch) {
    console.log('Testing connection to api.telegram.org with global fetch...');
    fetch('https://api.telegram.org', { method: 'HEAD' })
        .then(res => console.log(`FETCH STATUS: ${res.status}`))
        .catch(err => console.error('FETCH Error:', err));
} else {
    console.log('Global fetch not available');
}
