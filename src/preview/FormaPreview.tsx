import { useRef, useState, type KeyboardEvent } from "react";
import {
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
import styles from "../App.module.css";

type FormaPreviewProps = {
  createdProjects: { id: string; name: string }[];
  inspectEnabled: boolean;
  highlightedComponents: ComponentKey[];
  selectedComponentKey: ComponentKey | null;
  onInspect: (key: ComponentKey) => void;
  onCreateProject: (name: string) => void;
  style: PreviewStyle;
};

export function FormaPreview({
  createdProjects,
  inspectEnabled,
  highlightedComponents,
  selectedComponentKey,
  onInspect,
  onCreateProject,
  style,
}: FormaPreviewProps) {
  const createProjectDialog = useRef<HTMLDialogElement>(null);
  const createProjectButton = useRef<HTMLButtonElement>(null);
  const projectNameInput = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "projects" | "tasks" | "team">(
    "projects",
  );
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");
  const [projectSort, setProjectSort] = useState("updated");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [projectNameError, setProjectNameError] = useState("");
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
  const projects = [
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
    ...createdProjects.map((project) => ({
      ...project,
      title: project.name,
      category: "New project",
      status: "planning",
      progress: 0,
      color: "#6F7785",
      members: ["MS"],
    })),
  ];
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
                onClick={() =>
                  inspectEnabled ? onInspect("workspace-navigation") : setActiveSection(id)
                }
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
                onFocus={() =>
                  inspectEnabled ? onInspect("project-search") : setActiveSection("projects")
                }
                onChange={(event) => {
                  setProjectQuery(event.target.value);
                  setActiveSection("projects");
                }}
              />
              {projectQuery && (
                <button aria-label="Clear Forma search" onClick={() => setProjectQuery("")}>
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
            {activeSection === "projects" && (
              <>
                <div className={styles.pageHeading}>
                  <div>
                    <span className={styles.breadcrumb}>Workspace / Projects</span>
                    <h1>Projects</h1>
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
                    <select
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
                    </select>
                    <select
                      aria-label="Project sort"
                      aria-hidden={inspectEnabled}
                      disabled={inspectEnabled}
                      value={projectSort}
                      onChange={(event) => setProjectSort(event.target.value)}
                    >
                      <option value="updated">Most progressed</option>
                      <option value="name">Name</option>
                    </select>
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
                inspectEnabled={inspectEnabled}
                activityHighlight={activityHighlight}
                activitySelected={selectedComponentKey === "recent-activity"}
                metricHighlight={metricHighlight}
                actionHighlight={overviewActionHighlight}
                onInspectActivity={() => onInspect("recent-activity")}
                onInspectMetric={() => onInspect("metric-card")}
                onInspectAction={() => onInspect("overview-action")}
                onOpenProjects={() => setActiveSection("projects")}
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

function ActivityPanel({
  expanded,
  inspectEnabled,
  highlightClass,
  selected,
  onInspect,
  onToggle,
}: {
  expanded: boolean;
  inspectEnabled: boolean;
  highlightClass: string;
  selected: boolean;
  onInspect: () => void;
  onToggle: () => void;
}) {
  const activities = [
    {
      initials: "JL",
      name: "Jon Lee",
      action: "completed “Review navigation patterns”",
      meta: "Mobile app refresh · 18 minutes ago",
    },
    {
      initials: "AK",
      name: "Ana Kim",
      action: "uploaded 3 files",
      meta: "Design system · 1 hour ago",
    },
    {
      initials: "OR",
      name: "Owen Reed",
      action: "updated campaign milestones",
      meta: "Q4 campaign · Yesterday",
    },
    {
      initials: "MS",
      name: "Maya Santos",
      action: "created a new project brief",
      meta: "Mobile app refresh · Yesterday",
    },
  ];
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
        <p key={`${activity.initials}-${activity.action}`}>
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

function OverviewPanel({
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
}) {
  return (
    <article
      className={`${styles.projectCard} ${inspectEnabled ? styles.inspectable : ""} ${inspectEnabled ? highlightClass : ""}`}
      role={inspectEnabled ? "button" : undefined}
      aria-label={inspectEnabled ? `Inspect ${title} project card` : undefined}
      tabIndex={inspectEnabled ? 0 : undefined}
      onClick={inspectEnabled ? onInspect : undefined}
      onKeyDown={
        inspectEnabled
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onInspect();
              }
            }
          : undefined
      }
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
    </article>
  );
}
