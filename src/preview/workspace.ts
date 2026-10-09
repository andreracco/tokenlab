import { z } from "zod";

export const projectStatusSchema = z.enum(["planning", "in-progress", "review"]);
export type PreviewProjectStatus = z.infer<typeof projectStatusSchema>;

export const previewProjectChangesSchema = z.object({
  status: projectStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

export const previewProjectWorkspaceSchema = z.object({
  createdProjects: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
  projectChanges: z.record(z.string(), previewProjectChangesSchema),
  projectUpdates: z.array(
    z.object({
      id: z.string().min(1),
      projectId: z.string().min(1),
      initials: z.string().min(1),
      name: z.string().min(1),
      action: z.string().min(1),
      meta: z.string().min(1),
    }),
  ),
});

export type PreviewProjectChanges = z.infer<typeof previewProjectChangesSchema>;
export type PreviewProjectWorkspace = z.infer<typeof previewProjectWorkspaceSchema>;

export const emptyPreviewProjectWorkspace: PreviewProjectWorkspace = {
  createdProjects: [],
  projectChanges: {},
  projectUpdates: [],
};
