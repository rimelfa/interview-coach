/**
 * Run once to get a Dropbox refresh token.
 * Usage: node scripts/dropbox-auth.js
 */

const readline = require('readline');

const APP_KEY = 'r2kx24odyb7fec5';
const APP_SECRET = 'nea6otan502fryq';

const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${APP_KEY}&response_type=code&token_access_type=offline`;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Dropbox Authorization');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Click "Continue" and "Allow"');
console.log('3. Copy the authorization code shown\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste your authorization code here: ', async (code) => {
    rl.close();
    try {
        const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code.trim(),
                grant_type: 'authorization_code',
                client_id: APP_KEY,
                client_secret: APP_SECRET,
            }),
        });

        const data = await res.json();

        if (data.error) {
            console.error('\n❌ Error:', data.error_description || data.error);
            process.exit(1);
        }

        console.log('\n✅ Success! Add these to your .env:\n');
        console.log(`DROPBOX_APP_KEY=${APP_KEY}`);
        console.log(`DROPBOX_APP_SECRET=${APP_SECRET}`);
        console.log(`DROPBOX_REFRESH_TOKEN=${data.refresh_token}`);
        console.log('\nYou can remove the old DB_BACKUP_DROPBOX_TOKEN line.\n');
    } catch (err) {
        console.error('\n❌ Failed:', err.message);
        process.exit(1);
    }
});
