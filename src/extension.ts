// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

async function fetchData(request: any, outputChannel: vscode.OutputChannel) {
  const res = await fetch(request.url, {
    method: request.method,
    body: request.body,
    headers: request.headers,
  });
  const data = await res.json();
  outputChannel.appendLine(JSON.stringify(data));
  outputChannel.show();
  return data;
}

export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  const outputChannel = vscode.window.createOutputChannel("Voice Mode");
  outputChannel.appendLine("Voice Mode is active!");
  outputChannel.show();

  let webview = vscode.commands.registerCommand("voice-mode.helloWorld", () => {
    let panel = vscode.window.createWebviewPanel(
      "webview",
      "Voice Mode",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
      }
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      outputChannel.appendLine(JSON.stringify(message));
      outputChannel.show();
      switch (message.type) {
        case "display":
          vscode.window.showInformationMessage(message.payload);
          return;
        case "log":
          return;
        case "request":
          const data = await fetchData(message.payload, outputChannel);
          panel.webview.postMessage({
            type: "update-data",
            requestedBy: message.payload.requestedBy,
            payload: JSON.stringify(data),
          });
      }
    });

    // Paths to resources
    let scriptSrc = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "voice-mode",
        "dist",
        "index.js"
      )
    );
    let cssSrc = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "voice-mode",
        "dist",
        "index.css"
      )
    );

    const apiUrl = "https://chatgpt.com/backend-api";

    function getNonce() {
      let text = "";
      const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }

    const nonce = getNonce();

    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <link rel="stylesheet" href="${cssSrc}" />
      </head>
      <body>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src ${panel.webview.cspSource} 'nonce-${nonce}'; img-src ${panel.webview.cspSource} https:; font-src ${panel.webview.cspSource};">
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root" data-api-url="${apiUrl}" nonce="${nonce}"></div>
        <script src="${scriptSrc}" nonce="${nonce}"></script>
      </body>
    </html>
    `;
  });

  context.subscriptions.push(webview);
}

// This method is called when your extension is deactivated
export function deactivate() {}
