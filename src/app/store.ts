import { create } from "zustand";
import {
  applyCommand,
  applyCommands,
  initialProject,
  type ProjectDocument,
  type TokenCommand,
} from "../domain/tokens";
import { createSnapshot, type ProjectSnapshot } from "../domain/projects";
import {
  emptyPreviewProjectWorkspace,
  type PreviewProjectChanges,
  type PreviewProjectWorkspace,
} from "../preview/workspace";

type TokenLabState = {
  document: ProjectDocument;
  selectedTokenId: string;
  history: ProjectDocument[];
  future: ProjectDocument[];
  snapshots: ProjectSnapshot[];
  previewWorkspace: PreviewProjectWorkspace;
  selectToken: (tokenId: string) => void;
  execute: (command: TokenCommand) => void;
  executeBatch: (commands: TokenCommand[]) => void;
  undo: () => void;
  redo: () => void;
  hydrate: (document: ProjectDocument, snapshots: ProjectSnapshot[]) => void;
  hydratePreviewWorkspace: (workspace: PreviewProjectWorkspace) => void;
  createPreviewProject: (name: string) => void;
  updatePreviewProject: (id: string, title: string, changes: PreviewProjectChanges) => void;
  captureSnapshot: (name: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
};

export const useTokenLabStore = create<TokenLabState>((set) => ({
  document: initialProject,
  selectedTokenId: "color.brand.600",
  history: [],
  future: [],
  snapshots: [],
  previewWorkspace: emptyPreviewProjectWorkspace,
  selectToken: (selectedTokenId) => set({ selectedTokenId }),
  execute: (command) =>
    set((state) => ({
      document: applyCommand(state.document, command),
      history: [...state.history.slice(-99), state.document],
      future: [],
    })),
  executeBatch: (commands) => {
    if (commands.length === 0) return;
    set((state) => ({
      document: applyCommands(state.document, commands),
      history: [...state.history.slice(-99), state.document],
      future: [],
    }));
  },
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      return previous
        ? {
            document: previous,
            history: state.history.slice(0, -1),
            future: [state.document, ...state.future].slice(0, 100),
          }
        : state;
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      return next
        ? {
            document: next,
            history: [...state.history.slice(-99), state.document],
            future: state.future.slice(1),
          }
        : state;
    }),
  hydrate: (document, snapshots) => set({ document, snapshots, history: [], future: [] }),
  hydratePreviewWorkspace: (previewWorkspace) => set({ previewWorkspace }),
  createPreviewProject: (name) =>
    set((state) => {
      const id = crypto.randomUUID();
      return {
        previewWorkspace: {
          ...state.previewWorkspace,
          createdProjects: [...state.previewWorkspace.createdProjects, { id, name }],
          projectUpdates: [
            {
              id: crypto.randomUUID(),
              projectId: id,
              initials: "MS",
              name: "Maya Santos",
              action: `created project “${name}”`,
              meta: "New project · Just now",
            },
            ...state.previewWorkspace.projectUpdates,
          ],
        },
      };
    }),
  updatePreviewProject: (id, title, changes) =>
    set((state) => {
      const projectChanges = {
        ...state.previewWorkspace.projectChanges[id],
        ...changes,
      };
      const status = projectChanges.status ?? "planning";
      const progress = projectChanges.progress ?? 0;
      const statusLabel =
        status === "in-progress" ? "In progress" : status === "review" ? "In review" : "Planning";
      return {
        previewWorkspace: {
          ...state.previewWorkspace,
          projectChanges: { ...state.previewWorkspace.projectChanges, [id]: projectChanges },
          projectUpdates: [
            {
              id: crypto.randomUUID(),
              projectId: id,
              initials: "MS",
              name: "Maya Santos",
              action: `updated ${title}`,
              meta: `${statusLabel} · ${progress}% complete · Just now`,
            },
            ...state.previewWorkspace.projectUpdates,
          ],
        },
      };
    }),
  captureSnapshot: (name) =>
    set((state) => ({ snapshots: [...state.snapshots, createSnapshot(state.document, name)] })),
  restoreSnapshot: (snapshotId) =>
    set((state) => {
      const snapshot = state.snapshots.find((candidate) => candidate.id === snapshotId);
      return snapshot
        ? {
            document: structuredClone(snapshot.document),
            history: [...state.history.slice(-99), state.document],
            future: [],
          }
        : state;
    }),
}));
