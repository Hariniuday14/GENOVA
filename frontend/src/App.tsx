import { useEffect } from "react";
import { Route, Routes, useLocation, Link } from "react-router-dom";
import { Compass } from "lucide-react";

import { AppLayout } from "./components/layout/AppLayout";
import { Overview } from "./pages/Overview";
import { Analysis } from "./pages/Analysis";
import { Results } from "./pages/Results";
import { Evaluation } from "./pages/Evaluation";
import { Methodology } from "./pages/Methodology";
import { LinkButton } from "./components/ui/Button";
import { EmptyState } from "./components/ui/States";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}

function NotFound() {
  return (
    <>
      <EmptyState
        className="mt-12"
        icon={<Compass size={20} />}
        title="Page not found"
        description="That route does not exist in the GENOVA workspace."
        action={<LinkButton to="/">Back to overview</LinkButton>}
      />
      <p className="mt-4 text-center text-[12px] text-ink-faint">
        Looking for the API?{" "}
        <Link className="link" to="/methodology">
          See the methodology page
        </Link>
        .
      </p>
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="results" element={<Results />} />
          <Route path="evaluation" element={<Evaluation />} />
          <Route path="methodology" element={<Methodology />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
