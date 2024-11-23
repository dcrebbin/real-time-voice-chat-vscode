import React from "react";
import ReactDOM from "react-dom/client";

const App: React.FC = () => {
  return (
    <div>
      <h2>Voice Mode Controls</h2>
      <div>Voice commands will appear here</div>
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
