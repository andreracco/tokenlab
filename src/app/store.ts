import { create } from "zustand";
import { applyCommand, initialProject, type ProjectDocument, type TokenCommand } from "../domain/tokens";
import { createSnapshot, type ProjectSnapshot } from "../domain/projects";

type TokenLabState = {
  document: ProjectDocument;
  selectedTokenId: string;
  history: ProjectDocument[];
  future: ProjectDocument[];
  snapshots: ProjectSnapshot[];
  selectToken: (tokenId: string) => void;
  execute: (command: TokenCommand) => void;
  undo: () => void;
  redo: () => void;
  hydrate: (document: ProjectDocument, snapshots: ProjectSnapshot[]) => void;
  captureSnapshot: (name: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
};

export const useTokenLabStore = create<TokenLabState>((set) => ({
  document: initialProject,
  selectedTokenId: "color.brand.600",
  history: [],
  future: [],
  snapshots: [],
  selectToken: (selectedTokenId) => set({ selectedTokenId }),
  execute: (command) =>
    set((state) => ({
      document: applyCommand(state.document, command),
      history: [...state.history.slice(-99), state.document],
      future: [],
    })),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      return previous ? { document: previous, history: state.history.slice(0, -1), future: [state.document, ...state.future].slice(0, 100) } : state;
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      return next ? { document: next, history: [...state.history.slice(-99), state.document], future: state.future.slice(1) } : state;
    }),
  hydrate: (document, snapshots) => set({ document, snapshots, history: [], future: [] }),
  captureSnapshot: (name) => set((state) => ({ snapshots: [...state.snapshots, createSnapshot(state.document, name)] })),
  restoreSnapshot: (snapshotId) =>
    set((state) => {
      const snapshot = state.snapshots.find((candidate) => candidate.id === snapshotId);
      return snapshot ? { document: structuredClone(snapshot.document), history: [...state.history.slice(-99), state.document], future: [] } : state;
    }),
}));
