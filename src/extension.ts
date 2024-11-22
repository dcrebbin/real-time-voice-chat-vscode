// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// Custom sidebar view provider
class VoiceModeViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = `
			<!DOCTYPE html>
			<html>
				<body>
					<h2>Voice Mode Controls</h2>
					<div>Voice commands will appear here</div>
				</body>
			</html>
		`;
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
