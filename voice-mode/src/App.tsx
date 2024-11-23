import { useEffect, useState } from "react";
import "./App.css";
import { useRef, useMemo } from "react";
import type { WebviewApi } from "vscode-webview";
import { Marked, options } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import markedKatex, { MarkedKatexOptions } from "marked-katex-extension";

declare function acquireVsCodeApi(): any;
const vscode: WebviewApi<unknown> = acquireVsCodeApi();
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
function App() {
  const [conversationId, setConversationId] = useState("");
  const [latestMessage, setLatestMessage] = useState("");
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const authTokenRef = useRef<HTMLInputElement>(null);
  const [messageRetrievalDelay, setMessageRetrievalDelay] = useState(500);
  const COPY_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path>
  </svg>`;

  const [debugLog, setDebugLog] = useState("");
  const [isRetrievingMessages, setIsRetrievingMessages] = useState(false);

  let intervalIsOn = false;
  const state = useRef({
    lastMessageReceivedId: "",
    conversationId: "",
  });

  async function convertMarkdownToHTML(content: string, index: number) {
    // Configure marked options
    const marked = new Marked({
      ...markedHighlight({
        emptyLangClass: "hljs",
        langPrefix: "hljs language-",
        highlight(code: string, lang: string) {
          const language = hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(code, { language }).value;
        },
      }),
    });

    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
    });

    // Custom renderer to override default HTML output
    const renderer = new marked.Renderer();

    // Customize code blocks
    renderer.code = ({ text, lang }) => {
      const escapedText = text.replace(/`/g, "&#96;");
      const html = `<pre class="!overflow-visible">
        <div class="contain-inline-size rounded-md border-[0.5px] border-token-border-medium relative bg-token-sidebar-surface-primary dark:bg-gray-950">
          <div class="flex absolute top-0 w-full items-center text-token-text-secondary px-4 py-2 text-xs font-sans justify-between rounded-t-md h-9 bg-token-sidebar-surface-primary dark:bg-token-main-surface-secondary select-none">
            <p>${lang || ""}</p>
            <button id="${index}-copy-button" class="flex gap-1 items-center select-none py-1">
            ${COPY_ICON}
            <span>Copy code</span>
            </button>
          </div>
          <div class="overflow-y-auto p-4 flex" dir="ltr">
            <code class="!whitespace-pre hljs language-${lang}" id="${index}-code">${escapedText}</code>
          </div>
        </div>
      </pre>`;

      // Create a MutationObserver to watch for when the elements are added
      const observer = new MutationObserver((mutations, obs) => {
        const codeElement = document.getElementById(`${index}-code`);
        const copyButton = document.getElementById(`${index}-copy-button`);

        if (codeElement && copyButton) {
          copyButton.addEventListener("click", () => {
            console.log(`Copying code from element ${index}`);
            navigator.clipboard.writeText(codeElement.textContent || "");
            copyButton.innerHTML = COPY_ICON + "<span>Copied!</span>";
            setTimeout(() => {
              copyButton.innerHTML = COPY_ICON + "<span>Copy code</span>";
            }, 1000);
          });

          // Once we've found and set up our elements, disconnect the observer
          obs.disconnect();
        }
      });

      // Start observing the document with the configured parameters
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return html;
    };

    // Customize inline code
    renderer.codespan = ({ text }) => {
      const escapedText = text.replace(/`/g, "&#96;");
      return `<code class="bg-token-surface-primary rounded px-1.5 py-0.5">${escapedText}</code>`;
    };

    // Customize paragraphs
    renderer.paragraph = ({ text }) => {
      return `<p class="mb-4">${text}</p>`;
    };

    const katexOptions: MarkedKatexOptions = {
      throwOnError: false,
    };
    const katex = markedKatex(katexOptions);
    // Set the custom renderer
    marked.use({ renderer, ...katex });

    // Convert markdown to HTML
    return marked.parse(content);
  }

  function handleAuthTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    authTokenRef.current!.value = e.target.value;
  }

  const inputMemo = useMemo(() => {
    return (
      <input
        className="w-full text-black resize-y"
        onChange={handleAuthTokenChange}
        type="password"
        ref={authTokenRef}
      />
    );
  }, []);

  let lastMessage: any = {};
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authToken = window.localStorage.getItem("authToken");
      if (authToken) {
        authTokenRef.current!.value = authToken;
      }

      window.addEventListener("message", async (event) => {
        const message = event.data;
        if (lastMessage === message) {
          return;
        }
        const requestedBy = message.requestedBy;

        vscode.postMessage({
          type: "log",
          payload: `Received message: ${requestedBy}`,
        });
        lastMessage = message;
        const data = JSON.parse(message.payload);
        switch (message.requestedBy) {
          case "get-latest-conversation-id":
            if (!data?.items || !data?.items.length) {
              vscode.postMessage({
                type: "log",
                payload: `No conversations found: ${JSON.stringify(data)}`,
              });
              setConversationId("No conversations found");
              break;
            }
            setConversationId((prev) => data?.items[0]?.id || prev);
            break;
          case "get-latest-message":
            if (!data || !data.mapping) {
              vscode.postMessage({
                type: "log",
                payload: `No messages found: ${JSON.stringify(data)}`,
              });
              setLatestMessage("No messages found");
              break;
            }
            const filteredMapping = Object.entries(data.mapping).filter(
              ([key, value]: [string, any]) =>
                value?.message?.author?.role === "assistant"
            );

            const lastEntry = filteredMapping[filteredMapping.length - 1];
            const entry = lastEntry[1] as any;
            const message =
              entry.message.content?.parts[0]?.text ||
              entry.message.content.parts[0];

            if (entry.id === state.current.lastMessageReceivedId) {
              vscode.postMessage({
                type: "log",
                payload: "No new messages",
              });
              break;
            }

            vscode.postMessage({
              type: "log",
              payload: `Last message received ID: ${entry.id}`,
            });

            state.current.lastMessageReceivedId = entry.id;
            const convertedMarkdownElement = document.createElement("div");
            convertedMarkdownElement.innerHTML = await convertMarkdownToHTML(
              message,
              0
            );

            const messageContainer = messageContainerRef.current;
            if (messageContainer) {
              messageContainer.appendChild(convertedMarkdownElement);
            }
            break;
        }
      });
    }
  }, []);

  const LoadingIcon = useMemo(
    () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="size-4"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
    []
  );

  function handleMessageRetrievalDelayChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setMessageRetrievalDelay(parseInt(e.target.value));
  }

  let retrievalInterval: NodeJS.Timeout;

  function retrieveLatestMessage() {
    const authToken = authTokenRef.current?.value || "";

    vscode.postMessage({
      type: "request",
      payload: {
        requestedBy: "get-latest-message",
        method: "GET",
        escapeBackticks: true,
        url: `https://chatgpt.com/backend-api/conversation/${conversationId}`,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    });
  }

  useEffect(() => {
    if (isRetrievingMessages) {
      startRetrievingMessages();
    } else {
      if (retrievalInterval) {
        clearInterval(retrievalInterval);
      }
    }
  }, [isRetrievingMessages]);

  function startRetrievingMessages() {
    if (retrievalInterval) {
      clearInterval(retrievalInterval);
    }

    retrievalInterval = setInterval(() => {
      vscode.postMessage({
        type: "log",
        payload: `Retrieving latest message: ${
          isRetrievingMessages ? "true" : "false"
        }`,
      });
      retrieveLatestMessage();
    }, messageRetrievalDelay);
  }

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
            payload: `Auth token saved to local storage`,
          });
        }}
      >
        Set auth token
      </VSCodeButton>
      <p>Retrieval delay: {messageRetrievalDelay}ms</p>
      <input
        onChange={handleMessageRetrievalDelayChange}
        className="w-full text-black resize-y"
        type="range"
        min="200"
        max="1500"
        step="100"
        value={messageRetrievalDelay}
      />
      <VSCodeButton
        disabled={authTokenRef.current?.value === ""}
        onClick={async () => {
          const authToken = authTokenRef.current?.value || "";
          vscode.postMessage({
            type: "log",
            payload: `Getting latest conversation ID with auth token`,
          });
          setConversationId("Loading...");
          vscode.postMessage({
            type: "request",
            payload: {
              requestedBy: "get-latest-conversation-id",
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
        Get Latest Conversation ID
      </VSCodeButton>
      <p>Conversation ID:</p>
      <p>{conversationId}</p>
      <VSCodeButton
        disabled={!conversationId}
        onClick={() => {
          retrieveLatestMessage();
        }}
      >
        Get latest conversation
      </VSCodeButton>
      <VSCodeButton
        className="w-full flex justify-center"
        onClick={() => {
          if (retrievalInterval) {
            clearInterval(retrievalInterval);
          }
          setIsRetrievingMessages(!isRetrievingMessages);
        }}
      >
        {isRetrievingMessages ? (
          <span className="flex gap-2 items-center w-full justify-center">
            <span>Stop Retrieving Messages</span>
            <span className="animate-spin">{LoadingIcon}</span>
          </span>
        ) : (
          <span className="flex gap-2 items-center w-full justify-center">
            <span>Start Retrieving Messages</span>
          </span>
        )}
      </VSCodeButton>
      <p>Latest message:</p>
      <div
        className="markdown prose w-full break-words dark:prose-invert flex flex-col gap-4"
        ref={messageContainerRef}
      />
    </div>
  );
}

export default App;
