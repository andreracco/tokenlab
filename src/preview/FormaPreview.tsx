import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import type { ComponentKey } from "./registry";
import type { PreviewStyle } from "./style";
import { SelectControl } from "../components/SelectControl";
import {
  projectStatusSchema,
  type PreviewProjectChanges,
  type PreviewProjectStatus,
  type PreviewProjectWorkspace,
} from "./workspace";
import styles from "../App.module.css";

type FormaPreviewProps = {
  workspace: PreviewProjectWorkspace;
  inspectEnabled: boolean;
  highlightedComponents: ComponentKey[];
  selectedComponentKey: ComponentKey | null;
  onInspect: (key: ComponentKey) => void;
  onCreateProject: (name: string) => void;
  onUpdateProject: (id: string, title: string, changes: PreviewProjectChanges) => void;
  style: PreviewStyle;
};

type PreviewProject = {
  id: string;
  title: string;
  category: string;
  status: PreviewProjectStatus;
  progress: number;
  color: string;
  members: string[];
};

type ProjectActivity = {
  id: string;
  projectId: string;
  initials: string;
  name: string;
  action: string;
  meta: string;
};

export function FormaPreview({
  workspace,
  inspectEnabled,
  highlightedComponents,
  selectedComponentKey,
  onInspect,
  onCreateProject,
  onUpdateProject,
  style,
}: FormaPreviewProps) {
  const createProjectDialog = useRef<HTMLDialogElement>(null);
  const createProjectButton = useRef<HTMLButtonElement>(null);
  const projectNameInput = useRef<HTMLInputElement>(null);
  const projectListHeading = useRef<HTMLHeadingElement>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "projects" | "tasks" | "team">(
    "projects",
  );
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");
  const [projectSort, setProjectSort] = useState("updated");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [projectNameError, setProjectNameError] = useState("");
  const [createdProjectName, setCreatedProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const inspectClass = (key: ComponentKey) =>
    selectedComponentKey === key
      ? styles.inspectSelected
      : highlightedComponents.includes(key)
        ? styles.inspectImpact
        : "";
  const primaryHighlight = inspectClass("primary-button");
  const cardHighlight = inspectClass("project-card");
  const activityHighlight = inspectClass("recent-activity");
  const navigationHighlight = inspectClass("workspace-navigation");
  const searchHighlight = inspectClass("project-search");
  const filtersHighlight = inspectClass("project-filters");
  const notificationsHighlight = inspectClass("notification-control");
  const switcherHighlight = inspectClass("workspace-switcher");
  const metricHighlight = inspectClass("metric-card");
  const taskHighlight = inspectClass("task-row");
  const teamHighlight = inspectClass("team-card");
  const overviewActionHighlight = inspectClass("overview-action");
  const baseProjects: PreviewProject[] = [
    {
      id: "mobile-refresh",
      title: "Mobile app refresh",
      category: "Product",
      status: "in-progress",
      progress: 72,
      color: "#E9A23B",
      members: ["MS", "JL", "AK"],
    },
    {
      id: "q4-campaign",
      title: "Q4 campaign",
      category: "Marketing",
      status: "planning",
      progress: 48,
      color: "#D7648B",
      members: ["OR", "MS"],
    },
    {
      id: "design-system",
      title: "Design system",
      category: "Design",
      status: "review",
      progress: 86,
      color: "#5A69C8",
      members: ["AK", "JL", "OR"],
    },
  ];
  const projects = baseProjects
    .map((project) => ({ ...project, ...workspace.projectChanges[project.id] }))
    .concat(
      workspace.createdProjects.map((project) => ({
        ...project,
        title: project.name,
        category: "New project",
        status: "planning",
        progress: 0,
        color: "#6F7785",
        members: ["MS"],
        ...workspace.projectChanges[project.id],
      })),
    );
  const visibleProjects = projects
    .filter((project) => projectStatus === "all" || project.status === projectStatus)
    .filter((project) =>
      `${project.title} ${project.category}`
        .toLowerCase()
        .includes(projectQuery.trim().toLowerCase()),
    )
    .sort((left, right) =>
      projectSort === "name"
        ? left.title.localeCompare(right.title)
        : right.progress - left.progress,
    );
  const activities: ProjectActivity[] = [...workspace.projectUpdates, ...sampleActivities];
  const selectedProject = projects.find(({ id }) => id === selectedProjectId);
  const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "projects" as const, label: "Projects", icon: FolderKanban },
    { id: "tasks" as const, label: "My tasks", icon: CheckSquare2, count: 7 },
    { id: "team" as const, label: "Team", icon: Users },
  ];

  return (
    <div className={styles.previewStage}>
      <div className={styles.previewRoot} style={style} data-testid="preview-root">
        <aside className={styles.formaSidebar}>
          <div className={styles.formaLogo}>
            <span>F</span> forma
          </div>
          <div
            className={`${styles.workspaceSwitcher} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? switcherHighlight : ""}`}
          >
            <span className={styles.avatar}>AC</span>
            <span>
              Acme Studio<small>Product workspace</small>
            </span>
            {inspectEnabled && (
              <button
                type="button"
                className={styles.inspectOverlay}
                aria-label="Inspect workspace switcher"
                aria-pressed={selectedComponentKey === "workspace-switcher"}
                onClick={() => onInspect("workspace-switcher")}
              />
            )}
          </div>
          <nav aria-label="Forma navigation">
            {navItems.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                className={`${activeSection === id ? styles.navSelected : ""} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? navigationHighlight : ""}`}
                aria-current={activeSection === id ? "page" : undefined}
                aria-label={inspectEnabled ? `Inspect ${label} navigation item` : undefined}
                onClick={() => {
                  if (inspectEnabled) onInspect("workspace-navigation");
                  else {
                    setSelectedProjectId(null);
                    setActiveSection(id);
                  }
                }}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {count && <small>{count}</small>}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <span className={styles.avatar}>MS</span>
            <span>
              Maya Santos<small>maya@acme.co</small>
            </span>
          </div>
        </aside>
        <div className={styles.formaMain}>
          <div className={styles.formaTopbar}>
            <div
              className={`${styles.formaSearch} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? searchHighlight : ""}`}
              onClickCapture={(event) => {
                if (inspectEnabled) {
                  event.preventDefault();
                  event.stopPropagation();
                  onInspect("project-search");
                }
              }}
            >
              <Search aria-hidden="true" />
              <input
                aria-label={inspectEnabled ? "Inspect project search" : "Search Forma"}
                placeholder="Search projects"
                value={projectQuery}
                readOnly={inspectEnabled}
                onFocus={() => {
                  if (inspectEnabled) onInspect("project-search");
                  else {
                    setSelectedProjectId(null);
                    setActiveSection("projects");
                  }
                }}
                onChange={(event) => {
                  setProjectQuery(event.target.value);
                  setSelectedProjectId(null);
                  setActiveSection("projects");
                }}
              />
              {projectQuery && (
                <button
                  aria-label="Clear Forma search"
                  onClick={() => {
                    setProjectQuery("");
                    setSelectedProjectId(null);
                    setActiveSection("projects");
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
            <div className={styles.notificationControl}>
              <button
                className={`${styles.formaIconButton} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? notificationsHighlight : ""}`}
                aria-label={inspectEnabled ? "Inspect notification control" : "Notifications"}
                aria-expanded={!inspectEnabled && notificationsOpen}
                onClick={() =>
                  inspectEnabled
                    ? onInspect("notification-control")
                    : setNotificationsOpen((open) => !open)
                }
              >
                <Bell aria-hidden="true" />
                <span className={styles.notificationDot} />
              </button>
              {notificationsOpen && (
                <div className={styles.notificationPopover}>
                  <strong>Notifications</strong>
                  <span>
                    <CheckCircle2 aria-hidden="true" /> Design system moved to review
                  </span>
                  <span>
                    <Users aria-hidden="true" /> Ana mentioned you in Q4 campaign
                  </span>
                </div>
              )}
            </div>
            <span className={styles.avatar}>MS</span>
          </div>
          <div className={styles.formaContent}>
            {activeSection === "projects" && selectedProject && (
              <ProjectDetails
                project={selectedProject}
                activities={activities.filter(({ projectId }) => projectId === selectedProject.id)}
                onSave={(changes) =>
                  onUpdateProject(selectedProject.id, selectedProject.title, changes)
                }
                onBack={() => {
                  setSelectedProjectId(null);
                  requestAnimationFrame(() => projectListHeading.current?.focus());
                }}
              />
            )}
            {activeSection === "projects" && !selectedProject && (
              <>
                <div className={styles.pageHeading}>
                  <div>
                    <span className={styles.breadcrumb}>Workspace / Projects</span>
                    <h1 ref={projectListHeading} tabIndex={-1}>
                      Projects
                    </h1>
                    <p>Plan, track, and ship your team’s best work.</p>
                  </div>
                  <button
                    ref={createProjectButton}
                    className={`${styles.formaPrimary} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? primaryHighlight : ""}`}
                    onClick={() =>
                      inspectEnabled
                        ? onInspect("primary-button")
                        : createProjectDialog.current?.showModal()
                    }
                    aria-label={
                      inspectEnabled
                        ? "Create project; inspect action.primary.background"
                        : "Create project"
                    }
                  >
                    <Plus aria-hidden="true" /> Create project
                    {inspectEnabled && selectedComponentKey === "primary-button" && (
                      <small>action.primary.background</small>
                    )}
                  </button>
                </div>
                {createdProjectName && (
                  <div className={styles.projectCreatedNotice} role="status">
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>{createdProjectName}</strong> was created.
                    </span>
                    <button
                      type="button"
                      aria-label="Dismiss project confirmation"
                      onClick={() => setCreatedProjectName("")}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className={styles.projectToolbar}>
                  <div
                    className={`${styles.formaSearch} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? searchHighlight : ""}`}
                    onClickCapture={(event) => {
                      if (inspectEnabled) {
                        event.preventDefault();
                        event.stopPropagation();
                        onInspect("project-search");
                      }
                    }}
                  >
                    <Search aria-hidden="true" />
                    <input
                      aria-label={inspectEnabled ? "Inspect project search" : "Search projects"}
                      placeholder="Search projects"
                      value={projectQuery}
                      readOnly={inspectEnabled}
                      onFocus={() => inspectEnabled && onInspect("project-search")}
                      onChange={(event) => setProjectQuery(event.target.value)}
                    />
                    {projectQuery && (
                      <button aria-label="Clear project search" onClick={() => setProjectQuery("")}>
                        <X aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`${styles.projectFilters} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? filtersHighlight : ""}`}
                  >
                    <SelectControl
                      aria-label="Project status"
                      aria-hidden={inspectEnabled}
                      disabled={inspectEnabled}
                      value={projectStatus}
                      onChange={(event) => setProjectStatus(event.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="in-progress">In progress</option>
                      <option value="planning">Planning</option>
                      <option value="review">In review</option>
                    </SelectControl>
                    <SelectControl
                      aria-label="Project sort"
                      aria-hidden={inspectEnabled}
                      disabled={inspectEnabled}
                      value={projectSort}
                      onChange={(event) => setProjectSort(event.target.value)}
                    >
                      <option value="updated">Most progressed</option>
                      <option value="name">Name</option>
                    </SelectControl>
                    {inspectEnabled && (
                      <button
                        type="button"
                        className={styles.inspectOverlay}
                        aria-label="Inspect project filters"
                        aria-pressed={selectedComponentKey === "project-filters"}
                        onClick={() => onInspect("project-filters")}
                      />
                    )}
                  </div>
                  <span>
                    {visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}
                  </span>
                </div>
                {visibleProjects.length > 0 ? (
                  <div className={styles.projectGrid}>
                    {visibleProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        {...project}
                        inspectEnabled={inspectEnabled}
                        highlightClass={cardHighlight}
                        onInspect={() => onInspect("project-card")}
                        onOpen={() => setSelectedProjectId(project.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.projectEmpty}>
                    <Search aria-hidden="true" />
                    <strong>No matching projects</strong>
                    <span>Try a different search or status.</span>
                    <button
                      className={inspectEnabled ? styles.inspectable : ""}
                      aria-label={inspectEnabled ? "Inspect project filters" : "Clear filters"}
                      onClick={() => {
                        if (inspectEnabled) onInspect("project-filters");
                        else {
                          setProjectQuery("");
                          setProjectStatus("all");
                        }
                      }}
                    >
                      {inspectEnabled ? "Inspect filters" : "Clear filters"}
                    </button>
                  </div>
                )}
                <ActivityPanel
                  activities={activities}
                  expanded={showAllActivity}
                  inspectEnabled={inspectEnabled}
                  highlightClass={activityHighlight}
                  selected={selectedComponentKey === "recent-activity"}
                  onInspect={() => onInspect("recent-activity")}
                  onToggle={() => setShowAllActivity((expanded) => !expanded)}
                />
              </>
            )}
            {activeSection === "overview" && (
              <OverviewPanel
                activities={activities}
                inspectEnabled={inspectEnabled}
                activityHighlight={activityHighlight}
                activitySelected={selectedComponentKey === "recent-activity"}
                metricHighlight={metricHighlight}
                actionHighlight={overviewActionHighlight}
                onInspectActivity={() => onInspect("recent-activity")}
                onInspectMetric={() => onInspect("metric-card")}
                onInspectAction={() => onInspect("overview-action")}
                onOpenProjects={() => {
                  setSelectedProjectId(null);
                  setActiveSection("projects");
                }}
              />
            )}
            {activeSection === "tasks" && (
              <TasksPanel
                inspectEnabled={inspectEnabled}
                highlightClass={taskHighlight}
                onInspect={() => onInspect("task-row")}
              />
            )}
            {activeSection === "team" && (
              <TeamPanel
                inspectEnabled={inspectEnabled}
                highlightClass={teamHighlight}
                onInspect={() => onInspect("team-card")}
              />
            )}
          </div>
        </div>
        <dialog
          ref={createProjectDialog}
          className={styles.createProjectDialog}
          aria-labelledby="create-project-title"
          aria-describedby="create-project-description"
          onClose={(event) => {
            event.currentTarget.querySelector("form")?.reset();
            setProjectNameError("");
            createProjectButton.current?.focus();
          }}
        >
          <form
            method="dialog"
            noValidate
            onSubmit={(event) => {
              const name = String(
                new FormData(event.currentTarget).get("projectName") ?? "",
              ).trim();
              if (!name) {
                event.preventDefault();
                setProjectNameError("Enter a project name.");
                projectNameInput.current?.focus();
                return;
              }
              setCreatedProjectName(name);
              onCreateProject(name);
              event.currentTarget.reset();
            }}
          >
            <h2 id="create-project-title">Create project</h2>
            <p id="create-project-description">Start with a clear name and an owner.</p>
            <label>
              Project name
              <input
                ref={projectNameInput}
                name="projectName"
                autoFocus
                required
                aria-invalid={Boolean(projectNameError)}
                aria-describedby={
                  projectNameError ? "project-name-error" : "create-project-description"
                }
                onChange={() => setProjectNameError("")}
              />
            </label>
            <span id="project-name-error" className={styles.dialogError} role="alert">
              {projectNameError}
            </span>
            <div>
              <button type="button" onClick={() => createProjectDialog.current?.close()}>
                Cancel
              </button>
              <button className={styles.formaPrimary} value="create">
                Create project
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

const sampleActivities = [
  {
    id: "activity-navigation-review",
    projectId: "mobile-refresh",
    initials: "JL",
    name: "Jon Lee",
    action: "completed “Review navigation patterns”",
    meta: "Mobile app refresh · 18 minutes ago",
  },
  {
    id: "activity-files-uploaded",
    projectId: "design-system",
    initials: "AK",
    name: "Ana Kim",
    action: "uploaded 3 files",
    meta: "Design system · 1 hour ago",
  },
  {
    id: "activity-campaign-milestones",
    projectId: "q4-campaign",
    initials: "OR",
    name: "Owen Reed",
    action: "updated campaign milestones",
    meta: "Q4 campaign · Yesterday",
  },
  {
    id: "activity-new-brief",
    projectId: "mobile-refresh",
    initials: "MS",
    name: "Maya Santos",
    action: "created a new project brief",
    meta: "Mobile app refresh · Yesterday",
  },
];

function ActivityPanel({
  activities,
  expanded,
  inspectEnabled,
  highlightClass,
  selected,
  onInspect,
  onToggle,
}: {
  activities: ProjectActivity[];
  expanded: boolean;
  inspectEnabled: boolean;
  highlightClass: string;
  selected: boolean;
  onInspect: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`${styles.activityPanel} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? highlightClass : ""}`}
    >
      <div>
        <strong>Recent activity</strong>
        {!inspectEnabled && (
          <button aria-expanded={expanded} onClick={onToggle}>
            {expanded ? "Show less" : "View all"}
          </button>
        )}
      </div>
      {activities.slice(0, expanded ? activities.length : 2).map((activity) => (
        <p key={activity.id}>
          <span className={styles.avatar}>{activity.initials}</span>
          <span>
            <strong>{activity.name}</strong> {activity.action}
            <small>{activity.meta}</small>
          </span>
        </p>
      ))}
      {inspectEnabled && (
        <button
          type="button"
          className={styles.inspectOverlay}
          aria-label="Inspect Recent activity"
          aria-pressed={selected}
          onClick={onInspect}
        />
      )}
    </div>
  );
}

function ProjectDetails({
  project,
  activities,
  onSave,
  onBack,
}: {
  project: PreviewProject;
  activities: ProjectActivity[];
  onSave: (changes: PreviewProjectChanges) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const progressInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(project.status);
  const [progressDraft, setProgressDraft] = useState(String(project.progress));
  const [showProgressError, setShowProgressError] = useState(false);
  const progress = Number(progressDraft);
  const progressError =
    /^\d+$/.test(progressDraft) && progress >= 0 && progress <= 100
      ? ""
      : "Enter a whole number from 0 to 100.";
  const isDirty = status !== project.status || progressDraft !== String(project.progress);
  const statusLabel =
    project.status === "in-progress"
      ? "In progress"
      : project.status === "review"
        ? "In review"
        : "Planning";

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className={styles.projectDetails}>
      <button type="button" className={styles.backToProjects} onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Back to projects
      </button>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.breadcrumb}>Workspace / Projects / Overview</span>
          <h1 ref={heading} tabIndex={-1}>
            {project.title}
          </h1>
          <p>{project.category} project overview</p>
        </div>
        <span className={styles.projectDetailStatus}>{statusLabel}</span>
      </div>

      <div className={styles.projectDetailGrid}>
        <form
          className={`${styles.projectDetailCard} ${styles.projectDetailForm}`}
          aria-labelledby="project-progress-title"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (progressError) {
              setShowProgressError(true);
              progressInput.current?.focus();
              return;
            }
            if (isDirty) onSave({ status, progress });
          }}
        >
          <div className={styles.projectDetailMetricHeading}>
            <h2 id="project-progress-title">Progress</h2>
            <strong>{progress}%</strong>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={`${project.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%`, background: project.color }} />
          </div>
          <label className={styles.projectDetailField}>
            Status
            <SelectControl
              aria-label="Project status"
              value={status}
              onChange={(event) => {
                const value = projectStatusSchema.safeParse(event.target.value);
                if (value.success) setStatus(value.data);
              }}
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In progress</option>
              <option value="review">In review</option>
            </SelectControl>
          </label>
          <label className={styles.projectDetailField}>
            Progress (%)
            <input
              ref={progressInput}
              aria-label="Project progress"
              aria-invalid={showProgressError && Boolean(progressError)}
              aria-describedby={
                showProgressError && progressError ? "project-progress-error" : undefined
              }
              type="number"
              min={0}
              max={100}
              step={1}
              value={progressDraft}
              onChange={(event) => setProgressDraft(event.target.value)}
            />
            {showProgressError && progressError && (
              <small id="project-progress-error" className={styles.projectDetailError} role="alert">
                {progressError}
              </small>
            )}
          </label>
          <div className={styles.projectDetailActions}>
            <button type="submit" className={styles.projectDetailSave} disabled={!isDirty}>
              Save changes
            </button>
            <small>
              {progress === 0 ? "Ready to get started" : `${100 - progress}% remaining`}
            </small>
          </div>
        </form>

        <section className={styles.projectDetailCard} aria-labelledby="project-team-title">
          <h2 id="project-team-title">Team</h2>
          <div className={styles.projectDetailTeam}>
            {project.members.map((member) => (
              <span className={styles.projectDetailMember} key={member}>
                <span className={styles.avatar}>{member}</span>
                {teamMemberNames[member] ?? member}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.projectDetailCard} aria-labelledby="project-activity-title">
        <h2 id="project-activity-title">Recent activity</h2>
        {activities.length > 0 ? (
          activities.map((activity) => (
            <p className={styles.projectDetailActivity} key={activity.id}>
              <span className={styles.avatar}>{activity.initials}</span>
              <span>
                <strong>{activity.name}</strong> {activity.action}
                <small>{activity.meta}</small>
              </span>
            </p>
          ))
        ) : (
          <p className={styles.projectDetailEmpty}>No recent activity for this project.</p>
        )}
      </section>
    </div>
  );
}

const teamMemberNames: Record<string, string> = {
  MS: "Maya Santos",
  JL: "Jon Lee",
  AK: "Ana Kim",
  OR: "Owen Reed",
};

function OverviewPanel({
  activities,
  inspectEnabled,
  activityHighlight,
  activitySelected,
  metricHighlight,
  actionHighlight,
  onInspectActivity,
  onInspectMetric,
  onInspectAction,
  onOpenProjects,
}: {
  activities: ProjectActivity[];
  inspectEnabled: boolean;
  activityHighlight: string;
  activitySelected: boolean;
  metricHighlight: string;
  actionHighlight: string;
  onInspectActivity: () => void;
  onInspectMetric: () => void;
  onInspectAction: () => void;
  onOpenProjects: () => void;
}) {
  const metrics = [
    ["Active projects", "8", "2 due this week"],
    ["Tasks completed", "64", "+12% this month"],
    ["Team velocity", "92%", "On track"],
  ];
  return (
    <div className={styles.secondaryPage}>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.breadcrumb}>Workspace / Overview</span>
          <h1>Overview</h1>
          <p>A clear view of momentum across your workspace.</p>
        </div>
        <button
          className={`${styles.formaPrimary} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? actionHighlight : ""}`}
          onClick={() => (inspectEnabled ? onInspectAction() : onOpenProjects())}
          aria-label={inspectEnabled ? "Inspect overview action" : "View projects"}
        >
          View projects
        </button>
      </div>
      <div className={styles.metricGrid}>
        {metrics.map(([label, value, hint]) => (
          <article
            key={label}
            className={`${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? metricHighlight : ""}`}
            role={inspectEnabled ? "button" : undefined}
            aria-label={inspectEnabled ? `Inspect ${label} metric` : undefined}
            tabIndex={inspectEnabled ? 0 : undefined}
            onClick={inspectEnabled ? onInspectMetric : undefined}
            onKeyDown={
              inspectEnabled
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onInspectMetric();
                    }
                  }
                : undefined
            }
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <ActivityPanel
        activities={activities}
        expanded={false}
        inspectEnabled={inspectEnabled}
        highlightClass={activityHighlight}
        selected={activitySelected}
        onInspect={onInspectActivity}
        onToggle={onOpenProjects}
      />
    </div>
  );
}

function TasksPanel({
  inspectEnabled,
  highlightClass,
  onInspect,
}: {
  inspectEnabled: boolean;
  highlightClass: string;
  onInspect: () => void;
}) {
  const tasks = [
    ["Review navigation patterns", "Mobile app refresh", "Today"],
    ["Approve campaign brief", "Q4 campaign", "Tomorrow"],
    ["Document color decisions", "Design system", "Friday"],
  ];
  const activateOnKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onInspect();
    }
  };
  return (
    <div className={styles.secondaryPage}>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.breadcrumb}>Workspace / My tasks</span>
          <h1>My tasks</h1>
          <p>Focus on what needs your attention next.</p>
        </div>
      </div>
      <div className={styles.taskList}>
        {tasks.map(([title, project, due], index) => (
          <article
            key={title}
            className={`${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? highlightClass : ""}`}
            role={inspectEnabled ? "button" : undefined}
            aria-label={inspectEnabled ? `Inspect task: ${title}` : undefined}
            tabIndex={inspectEnabled ? 0 : undefined}
            onClick={inspectEnabled ? onInspect : undefined}
            onKeyDown={inspectEnabled ? activateOnKeyDown : undefined}
          >
            <span className={styles.taskCheck}>
              {index === 0 && <CheckCircle2 aria-hidden="true" />}
            </span>
            <span>
              <strong>{title}</strong>
              <small>{project}</small>
            </span>
            <time>{due}</time>
          </article>
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  inspectEnabled,
  highlightClass,
  onInspect,
}: {
  inspectEnabled: boolean;
  highlightClass: string;
  onInspect: () => void;
}) {
  const members = [
    ["MS", "Maya Santos", "Product lead"],
    ["AK", "Ana Kim", "Design engineer"],
    ["JL", "Jon Lee", "Product designer"],
  ];
  const activateOnKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onInspect();
    }
  };
  return (
    <div className={styles.secondaryPage}>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.breadcrumb}>Workspace / Team</span>
          <h1>Team</h1>
          <p>The people shaping Acme Studio.</p>
        </div>
      </div>
      <div className={styles.teamGrid}>
        {members.map(([initials, name, role]) => (
          <article
            key={name}
            className={`${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? highlightClass : ""}`}
            role={inspectEnabled ? "button" : undefined}
            aria-label={inspectEnabled ? `Inspect team member: ${name}` : undefined}
            tabIndex={inspectEnabled ? 0 : undefined}
            onClick={inspectEnabled ? onInspect : undefined}
            onKeyDown={inspectEnabled ? activateOnKeyDown : undefined}
          >
            <span className={styles.avatar}>{initials}</span>
            <strong>{name}</strong>
            <small>{role}</small>
            <span className={styles.onlineStatus}>Online</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  title,
  category,
  status,
  progress,
  color,
  members,
  inspectEnabled,
  highlightClass,
  onInspect,
  onOpen,
}: {
  title: string;
  category: string;
  status: string;
  progress: number;
  color: string;
  members: string[];
  inspectEnabled: boolean;
  highlightClass: string;
  onInspect: () => void;
  onOpen: () => void;
}) {
  const activate = inspectEnabled ? onInspect : onOpen;
  return (
    <article
      className={`${styles.projectCard} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? highlightClass : ""}`}
    >
      <div>
        <span className={styles.projectIcon} style={{ background: color }}>
          {title[0]}
        </span>
        <span className={styles.statusBadge}>
          {status === "in-progress"
            ? "In progress"
            : status === "review"
              ? "In review"
              : "Planning"}
        </span>
      </div>
      <h2>{title}</h2>
      <p>{category}</p>
      <div className={styles.progressLabel}>
        <span>Progress</span>
        <strong>{progress}%</strong>
      </div>
      <div className={styles.progressTrack}>
        <span style={{ width: `${progress}%`, background: color }} />
      </div>
      <div className={styles.cardFooter}>
        <div>
          {members.map((member) => (
            <span className={styles.avatar} key={member}>
              {member}
            </span>
          ))}
        </div>
        <span>Today</span>
      </div>
      <button
        type="button"
        className={inspectEnabled ? styles.inspectOverlay : styles.projectCardAction}
        aria-label={inspectEnabled ? `Inspect ${title} project card` : `Open project: ${title}`}
        onClick={activate}
      />
    </article>
  );
}
