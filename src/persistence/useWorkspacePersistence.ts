import { useEffect, useState } from "react";
import { useTokenLabStore } from "../app/store";
import { loadWorkspace, persistenceAvailable, saveWorkspace } from "./projectRepository";
import { emptyPreviewProjectWorkspace } from "../preview/workspace";

export function useWorkspacePersistence() {
  const document = useTokenLabStore((state) => state.document);
  const snapshots = useTokenLabStore((state) => state.snapshots);
  const previewWorkspace = useTokenLabStore((state) => state.previewWorkspace);
  const hydrate = useTokenLabStore((state) => state.hydrate);
  const hydratePreviewWorkspace = useTokenLabStore((state) => state.hydratePreviewWorkspace);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(
    persistenceAvailable
      ? "Loading local draft…"
      : "Local save unavailable — download your project",
  );

  useEffect(() => {
    if (!persistenceAvailable) return;
    let active = true;
    loadWorkspace()
      .then((workspace) => {
        if (!active) return;
        if (workspace) {
          hydrate(workspace.document, workspace.snapshots);
          hydratePreviewWorkspace(workspace.preview ?? emptyPreviewProjectWorkspace);
        }
        setReady(true);
        setStatus("Saved locally");
      })
      .catch(() => active && setStatus("Couldn't load — current draft preserved"));
    return () => {
      active = false;
    };
  }, [hydrate, hydratePreviewWorkspace]);

  useEffect(() => {
    if (!ready) return;
    setStatus("Saving…");
    const timeout = window.setTimeout(() => {
      saveWorkspace({ document, snapshots, preview: previewWorkspace })
        .then(() => setStatus("Saved locally"))
        .catch(() => setStatus("Couldn't save — download your project"));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [document, previewWorkspace, ready, snapshots]);

  return status;
}
