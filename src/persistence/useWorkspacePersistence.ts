import { useEffect, useState } from "react";
import { useTokenLabStore } from "../app/store";
import { loadWorkspace, persistenceAvailable, saveWorkspace } from "./projectRepository";

export function useWorkspacePersistence() {
  const document = useTokenLabStore((state) => state.document);
  const snapshots = useTokenLabStore((state) => state.snapshots);
  const hydrate = useTokenLabStore((state) => state.hydrate);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(persistenceAvailable ? "Loading local draft…" : "Local save unavailable");

  useEffect(() => {
    if (!persistenceAvailable) return;
    let active = true;
    loadWorkspace()
      .then((workspace) => {
        if (!active) return;
        if (workspace) hydrate(workspace.document, workspace.snapshots);
        setReady(true);
        setStatus("Saved locally");
      })
      .catch(() => active && setStatus("Couldn't load — current draft preserved"));
    return () => { active = false; };
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    setStatus("Saving…");
    const timeout = window.setTimeout(() => {
      saveWorkspace({ document, snapshots })
        .then(() => setStatus("Saved locally"))
        .catch(() => setStatus("Couldn't save — keep this tab open"));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [document, ready, snapshots]);

  return status;
}
