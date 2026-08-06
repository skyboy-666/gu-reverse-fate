import React from "react";
import ReactDOM from "react-dom/client";
import Game from "../app/page";
import "../app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>,
);
