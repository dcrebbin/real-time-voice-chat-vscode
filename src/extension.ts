// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// Custom sidebar view provider
class VoiceModeViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media"),
        vscode.Uri.joinPath(this._extensionUri, "dist"),
      ],
    };

    const outputChannel = vscode.window.createOutputChannel("Voice Mode");
    outputChannel.appendLine("Voice Mode is active!");
    outputChannel.show();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "testButton":
          outputChannel.appendLine(message.payload);
          outputChannel.show();
          vscode.window.showInformationMessage(message.payload);
          return;
        case "setAuthToken":
          outputChannel.appendLine(message.payload);
          outputChannel.show();
          return;
      }
    });

    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js")
    );

    // Add this helper function at the top of the file
    function getNonce() {
      let text = "";
      const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }

    const nonce = getNonce(); // Generate a nonce for security

    webviewView.webview.html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewView.webview.cspSource} 'unsafe-inline'; script-src ${webviewView.webview.cspSource} 'nonce-${nonce}'; img-src ${webviewView.webview.cspSource} https:; font-src ${webviewView.webview.cspSource};">
      <title>Voice Mode</title>
      <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
    </head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "voice-mode" is now active!');

  // Register the custom sidebar view provider
  const provider = new VoiceModeViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("voice-mode-view", provider)
  );

  // Register command to show the webview
  const showViewCommand = vscode.commands.registerCommand(
    "voice-mode.showView",
    () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.voice-mode-view"
      );
    }
  );

  // Register keyboard shortcut to show view
  const disposable = vscode.commands.registerCommand(
    "voice-mode.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from voice-mode!");
    }
  );

  context.subscriptions.push(showViewCommand);
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
