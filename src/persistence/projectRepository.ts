import { projectSchema, upgradeProject, type ProjectDocument } from "../domain/tokens";
import type { ProjectSnapshot } from "../domain/projects";
import {
  emptyPreviewProjectWorkspace,
  previewProjectWorkspaceSchema,
  type PreviewProjectWorkspace,
} from "../preview/workspace";

export type SavedWorkspace = {
  document: ProjectDocument;
  snapshots: ProjectSnapshot[];
  preview?: PreviewProjectWorkspace;
};

const databaseName = "tokenlab";
const storeName = "workspaces";
const workspaceKey = "local-draft";

export const persistenceAvailable = typeof indexedDB !== "undefined";

export async function loadWorkspace(): Promise<SavedWorkspace | null> {
  if (!persistenceAvailable) return null;
  const record = await request(openDatabase(), (database) =>
    database.transaction(storeName).objectStore(storeName).get(workspaceKey),
  );
  if (!record) return null;
  const previewResult = previewProjectWorkspaceSchema.safeParse(
    record.preview ?? emptyPreviewProjectWorkspace,
  );
  return {
    document: upgradeProject(projectSchema.parse(record.document)),
    snapshots: (record.snapshots ?? []).map((snapshot: ProjectSnapshot) => ({
      ...snapshot,
      document: upgradeProject(projectSchema.parse(snapshot.document)),
    })),
    preview: previewResult.success ? previewResult.data : emptyPreviewProjectWorkspace,
  };
}

export async function saveWorkspace(workspace: SavedWorkspace): Promise<void> {
  if (!persistenceAvailable) return;
  await request(openDatabase(), (database) =>
    database
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .put({ ...workspace, id: workspaceKey }),
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function request<T>(
  databasePromise: Promise<IDBDatabase>,
  run: (database: IDBDatabase) => IDBRequest<T>,
): Promise<T> {
  const database = await databasePromise;
  return new Promise((resolve, reject) => {
    const operation = run(database);
    operation.onsuccess = () => {
      database.close();
      resolve(operation.result);
    };
    operation.onerror = () => {
      database.close();
      reject(operation.error);
    };
  });
}
