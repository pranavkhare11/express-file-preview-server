require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/oauth2callback';

if (!clientId || !clientSecret) {
    console.error("❌ Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file first!");
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file']
});

console.log("\n=======================================================");
console.log("🔑 GOOGLE DRIVE REFRESH TOKEN GENERATOR");
console.log("=======================================================");
console.log("1. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Log in with your Google account (the one with Google One).");
console.log("3. Grant permissions, then copy the 'code' parameter from the redirect URL.");
console.log("=======================================================\n");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Paste the full redirect URL (or authorization code) here: ', async (input) => {
    try {
        let code = input.trim();
        if (code.startsWith('http://') || code.startsWith('https://')) {
            const parsedUrl = new URL(code);
            code = parsedUrl.searchParams.get('code') || code;
        }

        const { tokens } = await oauth2Client.getToken(code.trim());
        console.log("\n✅ SUCCESS! Copy your REFRESH TOKEN into your .env file:\n");
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    } catch (err) {
        console.error("❌ Error fetching token:", err.message);
    }
    rl.close();
});
