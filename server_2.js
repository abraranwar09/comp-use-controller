const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        const command = message.toString();
        if (!command) {
            console.log('No command provided');
            ws.send('Command is required');
            return;
        }

        try {
            console.log('Launching browser...');
            const browser = await puppeteer.launch({
                headless: false,
                protocolTimeout: 0
            });
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

            console.log('Streaming intermediary messages...');
            let loopCounter = 0;
            let previousMessageCount = 0;
            while (true) {
                loopCounter++;
                console.log(`Loop iteration: ${loopCounter}`);

                const messages = await page.evaluate(() => {
                    return Array.from(document.getElementsByClassName('language-python'))
                        .map(message => message.innerText);
                });

                if (messages.length > previousMessageCount) {
                    const newMessages = messages.slice(previousMessageCount);
                    newMessages.forEach(message => {
                        console.log('Intermediary message:', message);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(`{"status": "working", "message": "${message}"}`);
                        }
                    });
                    previousMessageCount = messages.length;
                }

                const statusWidgetVisible = await page.evaluate(() => {
                    const widget = document.querySelector('div[data-testid="stStatusWidget"]');
                    return widget !== null && window.getComputedStyle(widget).display !== 'none';
                });

                if (!statusWidgetVisible) {
                    console.log('Status widget not visible, breaking the loop.');
                    break;
                } else {
                    console.log('Status widget is visible, continuing the loop.');
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
            }

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
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(`{"status": "success", "message": "${lastMessage}"}`);
            }
            await browser.close();
        } catch (error) {
            console.error('An error occurred:', error);
            ws.send('An error occurred');
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
