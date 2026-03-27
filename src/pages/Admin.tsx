import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LogOut, User, FolderOpen, Clock, FileText, MessageSquare, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileManager from "@/components/admin/ProfileManager";
import ProjectsManager from "@/components/admin/ProjectsManager";
import TimelineManager from "@/components/admin/TimelineManager";
import ResumeManager from "@/components/admin/ResumeManager";
import MessagesManager from "@/components/admin/MessagesManager";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile",   label: "Profile",   icon: User,          desc: "Edit hero content and bio" },
  { id: "projects",  label: "Projects",  icon: FolderOpen,    desc: "Manage portfolio projects" },
  { id: "timeline",  label: "Timeline",  icon: Clock,         desc: "Work & education history" },
  { id: "resume",    label: "Resume",    icon: FileText,      desc: "Upload resume PDF" },
  { id: "messages",  label: "Messages",  icon: MessageSquare, desc: "Contact form submissions" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Admin() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [unreadCount, setUnreadCount] = useState(0);

  // Refresh unread message count whenever the active tab changes
  useEffect(() => {
    supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false)
      .then(({ count }) => setUnreadCount(count || 0));
  }, [activeTab]);

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 bg-background border-r shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-5 border-b">
          <span className="font-serif font-bold text-lg text-foreground">MT</span>
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">Portfolio</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab === tab.id
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-3">
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </span>
              {tab.id === "messages" && unreadCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer — user + actions */}
        <div className="border-t p-3 space-y-0.5">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            View Portfolio
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
          <div className="px-3 pt-2 pb-1">
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Auto-logout after 5 min idle
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-background border-b flex items-center justify-between px-4 h-14 shrink-0">
          <span className="font-serif font-bold text-lg">MT Admin</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </header>

        {/* Mobile tab bar */}
        <div className="md:hidden sticky top-14 z-20 bg-background border-b overflow-x-auto">
          <div className="flex gap-1 p-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "messages" && unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8">
          {/* Desktop page heading */}
          <div className="hidden md:flex items-start justify-between mb-7">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                Admin
              </p>
              <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">
                {currentTab.label}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{currentTab.desc}</p>
            </div>
            <Link
              to="/"
              className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Portfolio
            </Link>
          </div>

          <div className="max-w-3xl">
            {activeTab === "profile"  && <ProfileManager />}
            {activeTab === "projects" && <ProjectsManager />}
            {activeTab === "timeline" && <TimelineManager />}
            {activeTab === "resume"   && <ResumeManager />}
            {activeTab === "messages" && <MessagesManager />}
          </div>
        </main>
      </div>
    </div>
  );
}
