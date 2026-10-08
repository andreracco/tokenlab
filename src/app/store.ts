import { create } from "zustand";
import { applyCommand, initialProject, type ProjectDocument, type TokenCommand } from "../domain/tokens";

type TokenLabState = {
  document: ProjectDocument;
  selectedTokenId: string;
  history: ProjectDocument[];
  future: ProjectDocument[];
  selectToken: (tokenId: string) => void;
  execute: (command: TokenCommand) => void;
  undo: () => void;
  redo: () => void;
};

export const useTokenLabStore = create<TokenLabState>((set) => ({
  document: initialProject,
  selectedTokenId: "color.brand.600",
  history: [],
  future: [],
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
}));
