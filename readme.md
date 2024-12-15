# Puppeteer Computer Control Runner

This project is a Node.js application that uses Puppeteer to automate browser interactions. It listens for HTTP POST requests containing a command, which it then executes in a computer control streamlit interface running on `http://localhost:8501/`.

## Features

- Launches a headless browser using Puppeteer.
- Automates typing and submitting commands in a web interface.
- Waits for the command to complete and retrieves the last message from the chat.

## Prerequisites

- Node.js (version 14 or higher recommended)
- npm (Node Package Manager)

## Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the server:**

   ```bash
   node server.js
   ```

   The server will start on port 3000 by default, or on the port specified in the `PORT` environment variable.

## Usage

- Send a POST request to `http://localhost:3000/run-command` with a JSON body containing the `command` you wish to execute.

  Example using `curl`:

  ```bash
  curl -X POST http://localhost:3000/run-command -H "Content-Type: application/json" -d '{"command": "your-command-here"}'
  ```

- The server will respond with the last message content from the chat interface after the command execution is complete.

## Troubleshooting

- Ensure that the web interface is running on `http://localhost:8501/`.
- If the server hangs, check the console logs for any errors or messages indicating where the process might be stuck.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.
