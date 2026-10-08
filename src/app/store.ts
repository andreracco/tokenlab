import { create } from "zustand";
import { applyCommand, initialProject, type ProjectDocument, type TokenCommand } from "../domain/tokens";

type TokenLabState = {
  document: ProjectDocument;
  selectedTokenId: string;
  history: ProjectDocument[];
  selectToken: (tokenId: string) => void;
  execute: (command: TokenCommand) => void;
  undo: () => void;
};

export const useTokenLabStore = create<TokenLabState>((set) => ({
  document: initialProject,
  selectedTokenId: "color.brand.600",
  history: [],
  selectToken: (selectedTokenId) => set({ selectedTokenId }),
  execute: (command) =>
    set((state) => ({
      document: applyCommand(state.document, command),
      history: [...state.history.slice(-99), state.document],
    })),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      return previous ? { document: previous, history: state.history.slice(0, -1) } : state;
    }),
}));
