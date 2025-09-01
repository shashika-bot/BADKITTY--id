const { malvinid } = require('./id'); 
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { Storage } = require("megajs");

const {
    default: Malvin_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

// Function to generate a random Mega ID
function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

// Function to upload credentials to Mega
async function uploadCredsToMega(credsPath) {
    try {
        const storage = await new Storage({
            email: 'task9679@gmail.com', // Your Mega A/c Email Here
            password: 'Shashika@2008'   // Your Mega A/c Password Here
        }).ready;
        console.log('Mega storage initialized.');

        if (!fs.existsSync(credsPath)) {
            throw new Error(`File not found: ${credsPath}`);
        }

        const fileSize = fs.statSync(credsPath).size;
        const uploadResult = await storage.upload({
            name: `${randomMegaId()}.json`,
            size: fileSize
        }, fs.createReadStream(credsPath)).complete;

        console.log('Session successfully uploaded to Mega.');
        const fileNode = storage.files[uploadResult.nodeId];
        const megaUrl = await fileNode.link();
        console.log(`Session Url: ${megaUrl}`);
        return megaUrl;
    } catch (error) {
        console.error('Error uploading to Mega:', error);
        throw error;
    }
}

// Function to remove a file
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Final elegant message
const MALVIN_TEXT = `
━━━━━━━━━━━━━━━✦━━━━━━━━━━━━━━━
🎉 *BADKITTY Bot Activated!* 😼
━━━━━━━━━━━━━━━✦━━━━━━━━━━━━━━━

✅ *Session Connected Successfully!*  
🔑 Your *SESSION_ID* is ready (see above).  

⚠️ *Keep it Safe!*  
🙈 Don't show 👀  
🙊 Don't tell 🗣️  
🙉 Don't share 🔐  

━━━━━━━━━━━━━━━✦━━━━━━━━━━━━━━━
🚀 *Next Steps:*  
1️⃣ Add SESSION_ID to your env 🌐  
2️⃣ Restart your bot 🔄  
3️⃣ Rule WhatsApp like a 😎 cat-boss 🐱  
━━━━━━━━━━━━━━━✦━━━━━━━━━━━━━━━

📢 *Support Channel:*  
👉 https://whatsapp.com/channel/0029VbAq4fXE50UjplF09D3A  

⭐ *GitHub Repo:*  
👉 https://github.com/shashika-bot/  

💜 Thanks for choosing *BADKITTY*!  
🐾 Let the meow-gic begin! ✨
━━━━━━━━━━━━━━━✦━━━━━━━━━━━━━━━
`;

// Router to handle pairing code generation
router.get('/', async (req, res) => {
    const id = malvinid(); 
    let num = req.query.number;

    async function MALVIN_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            let Malvin = Malvin_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("chrome")
            });

            if (!Malvin.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Malvin.requestPairingCode(num);
                console.log(`Your Code: ${code}`);

                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            Malvin.ev.on('creds.update', saveCreds);
            Malvin.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);
                    const filePath = __dirname + `/temp/${id}/creds.json`;

                    if (!fs.existsSync(filePath)) {
                        console.error("File not found:", filePath);
                        return;
                    }

                    const megaUrl = await uploadCredsToMega(filePath);
                    const sid = megaUrl.includes("https://mega.nz/file/")
                        ? 'BΛDKIƬƬY' + megaUrl.split("https://mega.nz/file/")[1]
                        : 'Error: Invalid URL';

                    console.log(`Session ID: ${sid}`);

                    // Send session ID as text message
                    const session = await Malvin.sendMessage(Malvin.user.id, { text: sid });

                    // Send final elegant welcome message
                    await Malvin.sendMessage(Malvin.user.id, { text: MALVIN_TEXT }, { quoted: session });

                    await delay(100);
                    await Malvin.ws.close();
                    return removeFile('./temp/' + id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    MALVIN_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Service Has Been Restarted:", err);
            removeFile('./temp/' + id);

            if (!res.headersSent) {
                res.send({ code: "Service is Currently Unavailable" });
            }
        }
    }

    await MALVIN_PAIR_CODE();
});

module.exports = router;
