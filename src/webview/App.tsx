import type { WebviewApi } from "vscode-webview";
import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom/client";
declare function acquireVsCodeApi(): any;
const vscode: WebviewApi<unknown> = acquireVsCodeApi();
const App: React.FC = () => {
  const [authToken, setAuthToken] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [latestMessage, setLatestMessage] = useState("");
  const authTokenRef = useRef<HTMLInputElement>(null);
  async function getRecentConversation() {
    console.log(authToken);
    const res = await fetch(
      "https://chatgpt.com/backend-api/conversations?offset=0&limit=1&order=updated",
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (!res.ok) {
      console.error("Failed to get recent conversation ID");
      alert("Failed to get recent conversation ID, auth token may be invalid");
      return;
    }

    const data = await res.json();
    const latestConversation = data.items[0];
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
    console.log(conversationId);
    const res = await fetch(
      `https://chatgpt.com/backend-api/conversation/${conversationId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    if (!res.ok) {
      console.error("Failed to get latest conversations");
      alert("Failed to get latest conversations, auth token may be invalid");
      return;
    }
    const data = await res.json();

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

  useEffect(() => {
    getRecentConversation().then((conversation) => {
      if (conversation) {
        setConversationId(conversation.id);
      }
    });
  }, [authToken]);

  const inputMemo = useMemo(() => {
    return <input type="password" ref={authTokenRef} />;
  }, []);

  return (
    <div>
      <h2>Realtime Voice Mode Chat</h2>
      <button
        onClick={() => {
          console.log("Test button clicked");
          vscode.postMessage({
            type: "testButton",
            payload: "Hello World!",
          });
        }}
      >
        Test Button
      </button>
      <p>Auth token:</p>
      {inputMemo}
      <button
        onClick={() => {
          const token = authTokenRef.current?.value || "";
          vscode.postMessage({
            type: "setAuthToken",
            payload: token,
          });
          setAuthToken(token);
          console.log("Retrieving latest conversation");
          retrieveLatestConversation();
        }}
      >
        Set auth token
      </button>
      <p>Conversation ID:</p>
      <p>{conversationId}</p>
      <button onClick={() => retrieveLatestConversation()}>
        Get latest conversation
      </button>
      <p>Latest message:</p>
      <p>{latestMessage}</p>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
