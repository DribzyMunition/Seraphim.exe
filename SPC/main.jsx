import React from "react";
import ReactDOM from "react-dom/client";
import TweetCrafter from "./App";
import "./index.css"; // Tailwind will inject here

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TweetCrafter />
  </React.StrictMode>
);
