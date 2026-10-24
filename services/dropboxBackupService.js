const fs = require('fs');
const path = require('path');

async function getAccessToken() {
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!appKey || !appSecret || !refreshToken) {
    throw new Error('Missing DROPBOX_APP_KEY, DROPBOX_APP_SECRET, or DROPBOX_REFRESH_TOKEN');
  }

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Dropbox token refresh failed: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

function buildDropboxPath(basePath, fileName) {
  if (!basePath || basePath === '/') {
    return `/${fileName}`;
  }
  const trimmed = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${trimmed}/${fileName}`;
}

async function uploadBackupToDropbox(filePath) {
  const accessToken = await getAccessToken();
  const basePath = process.env.DB_BACKUP_DROPBOX_PATH || '/';
  const fileName = path.basename(filePath);
  const dropboxPath = buildDropboxPath(basePath, fileName);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/octet-stream',
    'Dropbox-API-Arg': JSON.stringify({
      path: dropboxPath,
      mode: 'add',
      autorename: true,
      mute: false,
      strict_conflict: false
    })
  };

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers,
    body: fs.createReadStream(filePath),
    duplex: 'half'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox upload failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

module.exports = {
  uploadBackupToDropbox
};
