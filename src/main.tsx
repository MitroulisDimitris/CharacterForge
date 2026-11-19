import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FeedbackWidget } from "./components/Feedback";
import { DiceProvider } from "./components/Dice";
import "./fonts.css";
import "./styles.css";
import { startTrail } from "./trail";

startTrail();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiceProvider>
      <App />
      <FeedbackWidget />
    </DiceProvider>
  </StrictMode>,
);
