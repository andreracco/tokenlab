import { useRef, useState } from "react";
import { Bell, CheckCircle2, CheckSquare2, FolderKanban, LayoutDashboard, Plus, Search, Users, X } from "lucide-react";
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

export function SpecimenPreview({ style }: { style: PreviewStyle }) {
  return (
    <div className={styles.previewStage}>
      <div className={`${styles.previewRoot} ${styles.specimenRoot}`} style={style} data-testid="preview-root">
        <header><span>Forma components</span><small>Visual reference · examples only</small></header>
        <div className={styles.specimenExamples} inert>
          <section><h2>Buttons</h2><div className={styles.specimenRow}><button className={`${styles.formaPrimary} ${styles.specimenDisplay}`} disabled>Primary</button><button className={`${styles.formaPrimary} ${styles.simulatedFocus} ${styles.specimenDisplay}`} disabled>Focus</button><button className={styles.formaPrimary} disabled>Disabled</button><button className={`${styles.formaPrimary} ${styles.specimenDisplay}`} disabled>••• Loading</button></div></section>
          <section><h2>Inputs</h2><div className={styles.specimenRow}><input placeholder="Default input" /><input className={styles.simulatedFocus} defaultValue="Focused value" /><input className={styles.inputError} defaultValue="Invalid value" /><input disabled placeholder="Disabled" /></div></section>
          <section><h2>Cards and badges</h2><div className={styles.specimenRow}><article className={styles.specimenCard}><span className={styles.specimenBadge}>In progress</span><h3>Design system</h3><p>Build reusable foundations for Forma.</p></article><article className={styles.specimenCard}><span className={styles.specimenBadge}>Complete</span><h3>Navigation audit</h3><p>Improve structure and wayfinding.</p></article></div></section>
          <section><h2>Tabs and menu</h2><div className={styles.specimenRow}><div className={styles.specimenTabs}><button className={styles.specimenDisplay} disabled>Overview</button><button className={`${styles.activeTab} ${styles.specimenDisplay}`} disabled>Activity</button><button className={styles.specimenDisplay} disabled>Files</button></div><div className={styles.specimenMenu}><button className={styles.specimenDisplay} disabled>Edit project</button><button className={styles.specimenDisplay} disabled>Duplicate</button><button className={styles.specimenDisplay} disabled>Archive</button></div></div></section>
          <section><h2>Modal preview</h2><div className={styles.specimenDialog}><strong>Create project</strong><p>Start with a clear name and an owner.</p><input placeholder="Project name" /><div><button className={styles.specimenDisplay} disabled>Cancel</button><button className={`${styles.formaPrimary} ${styles.specimenDisplay}`} disabled>Create project</button></div></div></section>
        </div>
      </div>
    </div>
  );
}

export function FormaPreview({ createdProjects, inspectEnabled, highlightedComponents, selectedComponentKey, onInspect, onCreateProject, style }: FormaPreviewProps) {
  const createProjectDialog = useRef<HTMLDialogElement>(null);
  const createProjectButton = useRef<HTMLButtonElement>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "projects" | "tasks" | "team">("projects");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");
  const [projectSort, setProjectSort] = useState("updated");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [projectNameError, setProjectNameError] = useState("");
  const primarySelected = highlightedComponents.includes("primary-button") || selectedComponentKey === "primary-button";
  const cardSelected = highlightedComponents.includes("project-card") || selectedComponentKey === "project-card";
  const projects = [
    { id: "mobile-refresh", title: "Mobile app refresh", category: "Product", status: "in-progress", progress: 72, color: "#E9A23B", members: ["MS", "JL", "AK"] },
    { id: "q4-campaign", title: "Q4 campaign", category: "Marketing", status: "planning", progress: 48, color: "#D7648B", members: ["OR", "MS"] },
    { id: "design-system", title: "Design system", category: "Design", status: "review", progress: 86, color: "#5A69C8", members: ["AK", "JL", "OR"] },
    ...createdProjects.map((project) => ({ ...project, title: project.name, category: "New project", status: "planning", progress: 0, color: "#6F7785", members: ["MS"] })),
  ];
  const visibleProjects = projects
    .filter((project) => projectStatus === "all" || project.status === projectStatus)
    .filter((project) => `${project.title} ${project.category}`.toLowerCase().includes(projectQuery.trim().toLowerCase()))
    .sort((left, right) => projectSort === "name" ? left.title.localeCompare(right.title) : right.progress - left.progress);
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
          <div className={styles.formaLogo}><span>F</span> forma</div>
          <div className={styles.workspaceSwitcher}><span className={styles.avatar}>AC</span><span>Acme Studio<small>Product workspace</small></span></div>
          <nav aria-label="Forma navigation">
            {navItems.map(({ id, label, icon: Icon, count }) => <button key={id} className={activeSection === id ? styles.navSelected : ""} aria-current={activeSection === id ? "page" : undefined} onClick={() => setActiveSection(id)}><Icon aria-hidden="true" /><span>{label}</span>{count && <small>{count}</small>}</button>)}
          </nav>
          <div className={styles.sidebarFooter}><span className={styles.avatar}>MS</span><span>Maya Santos<small>maya@acme.co</small></span></div>
        </aside>
        <div className={styles.formaMain}>
          <div className={styles.formaTopbar}>
            <div className={styles.formaSearch}><Search aria-hidden="true" /><input aria-label="Search Forma" placeholder="Search projects" value={projectQuery} onFocus={() => setActiveSection("projects")} onChange={(event) => { setProjectQuery(event.target.value); setActiveSection("projects"); }} />{projectQuery && <button aria-label="Clear Forma search" onClick={() => setProjectQuery("")}><X aria-hidden="true" /></button>}</div>
            <div className={styles.notificationControl}>
              <button className={styles.formaIconButton} aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell aria-hidden="true" /><span className={styles.notificationDot} /></button>
              {notificationsOpen && <div className={styles.notificationPopover}><strong>Notifications</strong><span><CheckCircle2 aria-hidden="true" /> Design system moved to review</span><span><Users aria-hidden="true" /> Ana mentioned you in Q4 campaign</span></div>}
            </div>
            <span className={styles.avatar}>MS</span>
          </div>
          <div className={styles.formaContent}>
            {activeSection === "projects" && <>
              <div className={styles.pageHeading}>
                <div><span className={styles.breadcrumb}>Workspace / Projects</span><h1>Projects</h1><p>Plan, track, and ship your team’s best work.</p></div>
                <button ref={createProjectButton} className={`${styles.formaPrimary} ${inspectEnabled && primarySelected ? styles.inspected : ""}`} onClick={() => inspectEnabled ? onInspect("primary-button") : createProjectDialog.current?.showModal()} aria-label={inspectEnabled ? "Create project; inspect action.primary.background" : "Create project"}>
                  <Plus aria-hidden="true" /> Create project
                  {inspectEnabled && primarySelected && <small>action.primary.background</small>}
                </button>
              </div>
              <div className={styles.projectToolbar}>
                <div className={styles.formaSearch}><Search aria-hidden="true" /><input aria-label="Search projects" placeholder="Search projects" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} />{projectQuery && <button aria-label="Clear project search" onClick={() => setProjectQuery("")}><X aria-hidden="true" /></button>}</div>
                <select aria-label="Project status" value={projectStatus} onChange={(event) => setProjectStatus(event.target.value)}><option value="all">All statuses</option><option value="in-progress">In progress</option><option value="planning">Planning</option><option value="review">In review</option></select>
                <select aria-label="Project sort" value={projectSort} onChange={(event) => setProjectSort(event.target.value)}><option value="updated">Most progressed</option><option value="name">Name</option></select>
                <span>{visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}</span>
              </div>
              {visibleProjects.length > 0 ? <div className={styles.projectGrid}>{visibleProjects.map((project) => <ProjectCard key={project.id} {...project} inspectEnabled={inspectEnabled} selected={cardSelected} onInspect={() => onInspect("project-card")} />)}</div> : <div className={styles.projectEmpty}><Search aria-hidden="true" /><strong>No matching projects</strong><span>Try a different search or status.</span><button onClick={() => { setProjectQuery(""); setProjectStatus("all"); }}>Clear filters</button></div>}
              <ActivityPanel expanded={showAllActivity} onToggle={() => setShowAllActivity((expanded) => !expanded)} />
            </>}
            {activeSection === "overview" && <OverviewPanel onOpenProjects={() => setActiveSection("projects")} />}
            {activeSection === "tasks" && <TasksPanel />}
            {activeSection === "team" && <TeamPanel />}
          </div>
        </div>
        <dialog ref={createProjectDialog} className={styles.createProjectDialog} aria-labelledby="create-project-title" onClose={(event) => { event.currentTarget.querySelector("form")?.reset(); setProjectNameError(""); createProjectButton.current?.focus(); }}>
          <form method="dialog" noValidate onSubmit={(event) => { const name = String(new FormData(event.currentTarget).get("projectName") ?? "").trim(); if (!name) { event.preventDefault(); setProjectNameError("Enter a project name."); return; } onCreateProject(name); event.currentTarget.reset(); }}>
            <h2 id="create-project-title">Create project</h2>
            <p>Start with a clear name and an owner.</p>
            <label>Project name<input name="projectName" autoFocus required aria-invalid={Boolean(projectNameError)} aria-describedby={projectNameError ? "project-name-error" : undefined} onChange={() => setProjectNameError("")} /></label>
            <span id="project-name-error" className={styles.dialogError} role="alert">{projectNameError}</span>
            <div><button type="button" onClick={() => createProjectDialog.current?.close()}>Cancel</button><button className={styles.formaPrimary} value="create">Create project</button></div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

function ActivityPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const activities = [
    { initials: "JL", name: "Jon Lee", action: "completed “Review navigation patterns”", meta: "Mobile app refresh · 18 minutes ago" },
    { initials: "AK", name: "Ana Kim", action: "uploaded 3 files", meta: "Design system · 1 hour ago" },
    { initials: "OR", name: "Owen Reed", action: "updated campaign milestones", meta: "Q4 campaign · Yesterday" },
    { initials: "MS", name: "Maya Santos", action: "created a new project brief", meta: "Mobile app refresh · Yesterday" },
  ];
  return <div className={styles.activityPanel}><div><strong>Recent activity</strong><button onClick={onToggle}>{expanded ? "Show less" : "View all"}</button></div>{activities.slice(0, expanded ? activities.length : 2).map((activity) => <p key={`${activity.initials}-${activity.action}`}><span className={styles.avatar}>{activity.initials}</span><span><strong>{activity.name}</strong> {activity.action}<small>{activity.meta}</small></span></p>)}</div>;
}

function OverviewPanel({ onOpenProjects }: { onOpenProjects: () => void }) {
  return <div className={styles.secondaryPage}><div className={styles.pageHeading}><div><span className={styles.breadcrumb}>Workspace / Overview</span><h1>Overview</h1><p>A clear view of momentum across your workspace.</p></div><button className={styles.formaPrimary} onClick={onOpenProjects}>View projects</button></div><div className={styles.metricGrid}><article><span>Active projects</span><strong>8</strong><small>2 due this week</small></article><article><span>Tasks completed</span><strong>64</strong><small>+12% this month</small></article><article><span>Team velocity</span><strong>92%</strong><small>On track</small></article></div><ActivityPanel expanded={false} onToggle={onOpenProjects} /></div>;
}

function TasksPanel() {
  const tasks = [["Review navigation patterns", "Mobile app refresh", "Today"], ["Approve campaign brief", "Q4 campaign", "Tomorrow"], ["Document color decisions", "Design system", "Friday"]];
  return <div className={styles.secondaryPage}><div className={styles.pageHeading}><div><span className={styles.breadcrumb}>Workspace / My tasks</span><h1>My tasks</h1><p>Focus on what needs your attention next.</p></div></div><div className={styles.taskList}>{tasks.map(([title, project, due], index) => <article key={title}><span className={styles.taskCheck}>{index === 0 && <CheckCircle2 aria-hidden="true" />}</span><span><strong>{title}</strong><small>{project}</small></span><time>{due}</time></article>)}</div></div>;
}

function TeamPanel() {
  const members = [["MS", "Maya Santos", "Product lead"], ["AK", "Ana Kim", "Design engineer"], ["JL", "Jon Lee", "Product designer"]];
  return <div className={styles.secondaryPage}><div className={styles.pageHeading}><div><span className={styles.breadcrumb}>Workspace / Team</span><h1>Team</h1><p>The people shaping Acme Studio.</p></div></div><div className={styles.teamGrid}>{members.map(([initials, name, role]) => <article key={name}><span className={styles.avatar}>{initials}</span><strong>{name}</strong><small>{role}</small><span className={styles.onlineStatus}>Online</span></article>)}</div></div>;
}

function ProjectCard({ title, category, status, progress, color, members, inspectEnabled, selected, onInspect }: { title: string; category: string; status: string; progress: number; color: string; members: string[]; inspectEnabled: boolean; selected: boolean; onInspect: () => void }) {
  return (
    <article className={`${styles.projectCard} ${inspectEnabled && selected ? styles.inspected : ""}`} role={inspectEnabled ? "button" : undefined} aria-label={inspectEnabled ? `Inspect ${title} project card` : undefined} tabIndex={inspectEnabled ? 0 : undefined} onClick={inspectEnabled ? onInspect : undefined} onKeyDown={inspectEnabled ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onInspect(); } } : undefined}>
      <div><span className={styles.projectIcon} style={{ background: color }}>{title[0]}</span><span className={styles.statusBadge}>{status === "in-progress" ? "In progress" : status === "review" ? "In review" : "Planning"}</span></div>
      <h2>{title}</h2><p>{category}</p>
      <div className={styles.progressLabel}><span>Progress</span><strong>{progress}%</strong></div>
      <div className={styles.progressTrack}><span style={{ width: `${progress}%`, background: color }} /></div>
      <div className={styles.cardFooter}><div>{members.map((member) => <span className={styles.avatar} key={member}>{member}</span>)}</div><span>Today</span></div>
    </article>
  );
}
