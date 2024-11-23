import { useState } from "react";
import "./App.css";
import { useRef, useMemo } from "react";
import type { WebviewApi } from "vscode-webview";
declare function acquireVsCodeApi(): any;
const vscode: WebviewApi<unknown> = acquireVsCodeApi();
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
  VSCodeTextField,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
function App() {
  const [authToken, setAuthToken] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [latestMessage, setLatestMessage] = useState("");
  const authTokenRef = useRef<HTMLInputElement>(null);

  async function getRecentConversation() {
    vscode.postMessage({
      type: "log",
      payload: `Getting the latest conversation with auth token: ${authToken}`,
    });
    const res = await fetch(
      "https://chatgpt.com/backend-api/conversations?offset=0&limit=1&order=updated",
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        method: "GET",
      }
    );

    if (!res.ok) {
      vscode.postMessage({
        type: "log",
        payload:
          "Failed to get recent conversation ID, auth token may be invalid",
      });
      return null;
    }

    const data: any = await res.json();
    vscode.postMessage({
      type: "log",
      payload: `Latest conversation retrieved: ${JSON.stringify(data)}`,
    });

    if (!data || !data.items || !data.items.length) {
      vscode.postMessage({
        type: "log",
        payload: "No conversations found",
      });
      return null;
    }

    const latestConversation = data.items[0];
    if (!latestConversation?.id || !latestConversation?.create_time) {
      vscode.postMessage({
        type: "log",
        payload: "Invalid conversation data received",
      });
      return null;
    }

    const createdTime = new Date(latestConversation.create_time);
    const now = new Date();
    const timeDifference = now.getTime() - createdTime.getTime();
    const minutesDifference = Math.floor(timeDifference / 60000);

    return {
      id: latestConversation.id,
      createdTime: createdTime,
      minutesDifference: minutesDifference,
    };
  }

  async function retrieveLatestConversation() {
    if (!conversationId) {
      vscode.postMessage({
        type: "log",
        payload: "No conversation ID to retrieve",
      });
      return;
    }
    vscode.postMessage({
      type: "log",
      payload: `Getting recent conversation with auth token: ${authToken}`,
    });
    const res = await fetch(
      `https://chatgpt.com/backend-api/conversation/${conversationId}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    if (!res.ok) {
      vscode.postMessage({
        type: "display",
        payload:
          "Failed to get latest conversations, auth token may be invalid",
      });
      return;
    }
    const data: any = await res.json();

    vscode.postMessage({
      type: "log",
      payload: JSON.stringify(data),
    });

    const filteredMapping = Object.entries(data.mapping).filter(
      ([key, value]: [string, any]) =>
        value?.message?.author?.role === "assistant"
    );

    const entries = Object.entries(filteredMapping);
    const lastEntry: [string, any] = entries[entries.length - 1];
    const entry = lastEntry[1][1];
    const message =
      entry.message.content?.parts[0]?.text || entry.message.content.parts[0];
    console.log(message);
    setLatestMessage(message);
  }

  const inputMemo = useMemo(() => {
    return <input type="password" ref={authTokenRef} />;
  }, []);

  async function handleTestButtonClick() {
    vscode.postMessage({
      type: "display",
      payload: "Hello World!",
    });
    const res = await fetch("https://quotes-api-self.vercel.app/quote");
    const data = await res.json();

    if (!res.ok) {
      vscode.postMessage({
        type: "display",
        payload: "Failed to fetch quote",
      });
      return;
    }
    vscode.postMessage({
      type: "display",
      payload: data.quote,
    });
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Realtime Voice Mode Chat</h2>
      <VSCodeButton
        className="cursor-pointer"
        onClick={() => {
          handleTestButtonClick();
        }}
      >
        Test Button
      </VSCodeButton>
      <p>Auth token:</p>
      {inputMemo}
      <VSCodeButton
        onClick={async () => {
          const token = authTokenRef.current?.value || "";
          vscode.postMessage({
            type: "log",
            payload: `Setting auth token: ${token}`,
          });
          setAuthToken(token);
          console.log("Retrieving latest conversation");
          await getRecentConversation()
            .then((conversation) => {
              vscode.postMessage({
                type: "log",
                payload: `Latest conversation retrieved: ${JSON.stringify(
                  conversation
                )}`,
              });
            })
            .catch((err) => {
              vscode.postMessage({
                type: "log",
                payload: `Error retrieving latest conversation: ${err}`,
              });
            });
        }}
      >
        Set auth token
      </VSCodeButton>
      <p>Conversation ID:</p>
      <p>{conversationId}</p>
      <VSCodeButton onClick={() => retrieveLatestConversation()}>
        Get latest conversation
      </VSCodeButton>
      <p>Latest message:</p>
      <p>{latestMessage}</p>
    </div>
  );
}

export default App;
