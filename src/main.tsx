import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FeedbackWidget } from "./components/Feedback";
import "./styles.css";
import { startTrail } from "./trail";

startTrail();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <FeedbackWidget />
  </StrictMode>,
);
