import { useEffect } from "react";

export default function usePageTitle(pageTitle, appName = "Finca La Magdalena") {
  useEffect(() => {
    if (!pageTitle) {
      document.title = appName;
      return;
    }
    document.title = `${pageTitle} – ${appName}`;
  }, [pageTitle, appName]);
}
