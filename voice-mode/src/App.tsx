import { useEffect, useState } from "react";
import "./App.css";
import { useRef, useMemo } from "react";
import type { WebviewApi } from "vscode-webview";
declare function acquireVsCodeApi(): any;
const vscode: WebviewApi<unknown> = acquireVsCodeApi();
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
function App() {
  const [conversationId, setConversationId] = useState("");
  const [latestMessage, setLatestMessage] = useState("");
  const authTokenRef = useRef<HTMLInputElement>(null);
  const [latestQuote, setLatestQuote] = useState("");

  async function getRecentConversation() {
    const authToken = authTokenRef.current?.value || "";
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

  function handleAuthTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    authTokenRef.current!.value = e.target.value;
  }

  const inputMemo = useMemo(() => {
    return (
      <input
        onChange={handleAuthTokenChange}
        type="password"
        ref={authTokenRef}
      />
    );
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const authToken = window.localStorage.getItem("authToken");
      if (authToken) {
        authTokenRef.current!.value = authToken;
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        const requestedBy = message.requestedBy;

        vscode.postMessage({
          type: "log",
          payload: `Received message: ${requestedBy}`,
        });
        const data = JSON.parse(message.payload);
        switch (message.requestedBy) {
          case "auth-token":
            setConversationId(data?.items[0]?.id || JSON.stringify(data));
            break;
          case "conversation":
            const filteredMapping = Object.entries(data.mapping).filter(
              ([key, value]: [string, any]) =>
                value?.message?.author?.role === "assistant"
            );

            const entries = Object.entries(filteredMapping);
            const lastEntry: [string, any] = entries[entries.length - 1];
            const entry = lastEntry[1][1];
            const message =
              entry.message.content?.parts[0]?.text ||
              entry.message.content.parts[0];
            setLatestMessage(message || "Error");
            break;
        }
      });
    }
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Realtime Voice Mode Chat</h2>
      <p>Auth token:</p>
      {inputMemo}
      <VSCodeButton
        onClick={async () => {
          const authToken = authTokenRef.current?.value || "";

          window.localStorage.setItem("authToken", authToken);

          vscode.postMessage({
            type: "display",
            payload: `Auth token saved to local storage, retrieving latest conversation ID`,
          });
          vscode.postMessage({
            type: "request",
            payload: {
              requestedBy: "auth-token",
              method: "GET",
              url: "https://chatgpt.com/backend-api/conversations?offset=0&limit=1&order=updated",
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            },
          });
        }}
      >
        Set auth token
      </VSCodeButton>
      <p>Conversation ID:</p>
      <p>{conversationId}</p>
      <VSCodeButton
        onClick={() => {
          const authToken = authTokenRef.current?.value || "";
          vscode.postMessage({
            type: "request",
            payload: {
              requestedBy: "conversation",
              method: "GET",
              url: `https://chatgpt.com/backend-api/conversation/${conversationId}`,
              headers: {
                Authorization: `Bearer ${authToken}`,
                "Content-Type": "application/json",
              },
            },
          });
        }}
      >
        Get latest conversation
      </VSCodeButton>
      <p>Latest message:</p>
      <p>{latestMessage}</p>
    </div>
  );
}

export default App;
