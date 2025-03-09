const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const cors = require('cors');

const PORT = 5173;

const wss = new WebSocket.Server({ port: PORT });

let browser;
let window = {};

const executionURL = `http://15.204.31.96:8501/`
const localURL = `http://localhost:8501/`

wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const data = JSON.parse(message);

        if (data.type === 'start-session') {
            try {
                console.log('Launching browser...');
                browser = await puppeteer.launch({
                    headless: true,
                    protocolTimeout: 0
                });
                const page = await browser.newPage();
                window.page = page;
                console.log(`Navigating to ${executionURL}`);
                await page.goto(executionURL);

                console.log('Waiting for the textarea to be available...');
                await page.waitForSelector('textarea[aria-label="Type a message to send to Claude to control the computer..."]', { timeout: 0 });

                ws.send(JSON.stringify({ message: 'session started successfully' }));
            } catch (error) {
                console.error('An error occurred:', error);
                ws.send(JSON.stringify({ message: 'An error occurred' }));
            }
        } else if (data.type === 'close-session') {
            if (browser) {
                await browser.close();
                ws.send(JSON.stringify({ message: 'session stopped successfully' }));
            } else {
                ws.send(JSON.stringify({ message: 'No active session to close' }));
            }
        } else if (data.type === 'command') {
            try {
                
                console.log('Typing command into textarea...');
                await window.page.type('textarea[aria-label="Type a message to send to Claude to control the computer..."]', data.command);
        
                console.log('Waiting for button to be available...');
                await window.page.waitForSelector('button[data-testid="stChatInputSubmitButton"]', { timeout: 0 });

                console.log('Clicking the button...');
                await window.page.evaluate(() => {
                    const button = document.querySelector('button[data-testid="stChatInputSubmitButton"]');
                    if (button) {
                        button.click();
                    } else {
                        throw new Error('Button not found');
                    }
                });

                console.log('Waiting for the status widget to appear...');
                await window.page.waitForSelector('div[data-testid="stStatusWidget"]', { visible: true, timeout: 0 });

                console.log('Waiting for the command to finish...');
                await window.page.waitForFunction(() => {
                    const statusWidget = document.querySelector('div[data-testid="stStatusWidget"]');
                    return !statusWidget;
                }, { timeout: 0 });

                console.log('Fetching the last chat message...');
                const lastMessage = await window.page.evaluate(() => {
                    const messages = document.querySelectorAll('div[data-testid="stChatMessage"]');
                    if (messages.length === 0) {
                        return 'No messages found';
                    }
                    const lastMessage = messages[messages.length - 1];
                    return lastMessage ? lastMessage.innerText : 'No message content found';
                });

                console.log('Last message content:', lastMessage);
                ws.send(JSON.stringify({ type: 'result',message: lastMessage }));
            } catch (error) {
                console.error('An error occurred:', error);
                ws.send(JSON.stringify({ message: 'An error occurred' }));
            }
        }
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
