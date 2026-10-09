import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTokenLabStore } from "../app/store";
import { initialProject } from "../domain/tokens";
import { emptyPreviewProjectWorkspace } from "../preview/workspace";
import type { SavedWorkspace } from "./projectRepository";

const repository = vi.hoisted(() => ({
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
}));

vi.mock("./projectRepository", () => ({
  persistenceAvailable: true,
  loadWorkspace: repository.loadWorkspace,
  saveWorkspace: repository.saveWorkspace,
}));

import { useWorkspacePersistence } from "./useWorkspacePersistence";

function PersistenceStatus() {
  return <div>{useWorkspacePersistence()}</div>;
}

afterEach(cleanup);

beforeEach(() => {
  repository.loadWorkspace.mockReset();
  repository.saveWorkspace.mockReset();
  useTokenLabStore.setState({
    document: initialProject,
    selectedTokenId: "color.brand.600",
    history: [],
    future: [],
    snapshots: [],
    previewWorkspace: emptyPreviewProjectWorkspace,
  });
});

describe("workspace persistence", () => {
  it("hydrates a saved workspace before reporting success", async () => {
    const savedDocument = structuredClone(initialProject);
    savedDocument.name = "Recovered draft";
    repository.loadWorkspace.mockResolvedValue({
      document: savedDocument,
      snapshots: [],
      preview: {
        createdProjects: [{ id: "created-1", name: "Saved project" }],
        projectChanges: { "created-1": { status: "review", progress: 65 } },
        projectUpdates: [],
      },
    });

    render(<PersistenceStatus />);

    expect(screen.getByText("Loading local draft…")).toBeTruthy();
    expect(await screen.findByText("Saved locally")).toBeTruthy();
    expect(useTokenLabStore.getState().document.name).toBe("Recovered draft");
    expect(useTokenLabStore.getState().previewWorkspace.createdProjects).toEqual([
      { id: "created-1", name: "Saved project" },
    ]);
    expect(useTokenLabStore.getState().previewWorkspace.projectChanges["created-1"]).toEqual({
      status: "review",
      progress: 65,
    });
    expect(repository.saveWorkspace).not.toHaveBeenCalled();
  });

  it("saves document edits and reports completion", async () => {
    repository.loadWorkspace.mockResolvedValue(null);
    repository.saveWorkspace.mockResolvedValue(undefined);
    render(<PersistenceStatus />);
    await screen.findByText("Saved locally");

    act(() =>
      useTokenLabStore.getState().execute({
        type: "set-color",
        tokenId: "color.brand.600",
        mode: "light",
        value: "#C2415D",
      }),
    );

    expect(screen.getByText("Saving…")).toBeTruthy();
    await waitFor(() => expect(repository.saveWorkspace).toHaveBeenCalledTimes(1), {
      timeout: 800,
    });
    expect(await screen.findByText("Saved locally")).toBeTruthy();
    const savedWorkspace = repository.saveWorkspace.mock.calls[0][0] as SavedWorkspace;
    expect(
      savedWorkspace.document.tokens.find((token) => token.id === "color.brand.600")?.values.light,
    ).toEqual({ kind: "literal", value: "#C2415D" });
    expect(savedWorkspace.preview).toEqual(emptyPreviewProjectWorkspace);
  });

  it("persists preview project edits with the workspace", async () => {
    repository.loadWorkspace.mockResolvedValue(null);
    repository.saveWorkspace.mockResolvedValue(undefined);
    render(<PersistenceStatus />);
    await screen.findByText("Saved locally");

    let savedProjectId = "";
    act(() => {
      useTokenLabStore.getState().createPreviewProject("Saved project");
      savedProjectId =
        useTokenLabStore.getState().previewWorkspace.createdProjects.at(-1)?.id ?? "";
      if (savedProjectId)
        useTokenLabStore.getState().updatePreviewProject(savedProjectId, "Saved project", {
          status: "in-progress",
          progress: 45,
        });
    });

    await waitFor(() => expect(repository.saveWorkspace).toHaveBeenCalledTimes(1), {
      timeout: 800,
    });
    const savedWorkspace = repository.saveWorkspace.mock.calls[0][0] as SavedWorkspace;
    expect(savedWorkspace.preview?.createdProjects).toHaveLength(1);
    expect(savedWorkspace.preview?.projectChanges[savedProjectId]).toEqual({
      status: "in-progress",
      progress: 45,
    });
    expect(savedWorkspace.preview?.projectUpdates).toHaveLength(2);
  });

  it("keeps the current draft and exposes load and save failures", async () => {
    repository.loadWorkspace.mockRejectedValueOnce(new Error("load failed"));
    const first = render(<PersistenceStatus />);
    expect(await screen.findByText("Couldn't load — current draft preserved")).toBeTruthy();
    expect(useTokenLabStore.getState().document).toEqual(initialProject);
    first.unmount();

    repository.loadWorkspace.mockResolvedValueOnce(null);
    repository.saveWorkspace.mockRejectedValueOnce(new Error("save failed"));
    render(<PersistenceStatus />);
    await screen.findByText("Saved locally");
    act(() => useTokenLabStore.getState().captureSnapshot("Before changes"));

    expect(
      await screen.findByText("Couldn't save — download your project", {}, { timeout: 800 }),
    ).toBeTruthy();
  });
});
