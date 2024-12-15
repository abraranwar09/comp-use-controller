const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.post('/run-command', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        console.log('No command provided');
        return res.status(400).send('Command is required');
    }

    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        console.log('Navigating to http://localhost:8501/');
        await page.goto('http://localhost:8501/');

        console.log('Waiting for the textarea to be available...');
        await page.waitForSelector('textarea[aria-label="Type a message to send to Claude to control the computer..."]', { timeout: 0 });

        console.log('Typing command into textarea...');
        await page.type('textarea[aria-label="Type a message to send to Claude to control the computer..."]', command);

        console.log('Waiting for button to be available...');
        await page.waitForSelector('button[data-testid="stChatInputSubmitButton"]', { timeout: 0 });

        console.log('Clicking the button...');
        await page.evaluate(() => {
            const button = document.querySelector('button[data-testid="stChatInputSubmitButton"]');
            if (button) {
                button.click();
            } else {
                throw new Error('Button not found');
            }
        });

        console.log('Waiting for the status widget to appear...');
        await page.waitForSelector('div[data-testid="stStatusWidget"]', { visible: true, timeout: 0 });

        console.log('Waiting for the command to finish...');
        await page.waitForFunction(() => {
            const statusWidget = document.querySelector('div[data-testid="stStatusWidget"]');
            return !statusWidget;
        }, { timeout: 0 });

        console.log('Fetching the last chat message...');
        const lastMessage = await page.evaluate(() => {
            const messages = document.querySelectorAll('div[data-testid="stChatMessage"]');
            if (messages.length === 0) {
                return 'No messages found';
            }
            const lastMessage = messages[messages.length - 1];
            return lastMessage ? lastMessage.innerText : 'No message content found';
        });

        console.log('Last message content:', lastMessage);
        res.send(lastMessage);
        await browser.close();
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('An error occurred');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
