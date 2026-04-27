import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./style-presets.css";

const storedStylePreference = window.localStorage.getItem("quantumx-style-preference");
document.documentElement.dataset.style =
  storedStylePreference === "cold-white" ||
  storedStylePreference === "moonlight" ||
  storedStylePreference === "glass" ||
  storedStylePreference === "dark-first"
    ? storedStylePreference
    : "moonlight";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
