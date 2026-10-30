import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnalysisProvider } from "./lib/analysis-context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AnalysisProvider>
          <App />
        </AnalysisProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
