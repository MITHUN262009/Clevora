import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Bell, BookOpen, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3,
  GraduationCap, Home, Landmark, Loader2, Moon, NotebookPen, Plus, Search, Sun, Trash2, UserRound,
  UsersRound, WalletCards, X, ImagePlus, ClipboardList, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Tab = "home" | "planner" | "notes" | "campus" | "profile";
type Extra = "attendance" | "expenses" | "reminders" | null;
type ComposerType = "task" | "note" | "expense" | "reminder" | "subject" | "exam" | "timetable" | null;

type Subject = { id: string; name: string; code: string; color: string };
type Task = { id: string; title: string; completed: boolean; deadline: string | null; scheduled_for: string | null; subject_id: string | null };
type Note = { id: string; title: string; content: string; important: boolean; subject_id: string | null; updated_at: string };
type Attendance = { id: string; subject_id: string | null; attended: number; total: number };
type Expense = { id: string; amount: number; category: string; description: string; spent_on: string };
type Reminder = { id: string; title: string; reminder_type: string; subject: string; due_at: string; completed: boolean };
type TimetableEntry = { id: string; subject_id: string | null; title: string; day_of_week: number; start_time: string; end_time: string; room: string };
type ExamPlan = { id: string; subject_id: string | null; title: string; exam_date: string; start_time: string; end_time: string; notes: string; completed: boolean };
type Profile = { full_name: string; stream: string; course: string; academic_year: number; semester: number; dark_mode: boolean; monthly_budget: number; avatar_url: string | null };

const STREAMS = [
  "Engineering & Technology", "Computer Applications & IT", "Science", "Commerce & Management",
  "Arts & Humanities", "Design & Media", "Law", "Medicine & Health Sciences", "Education", "Agriculture & Life Sciences",
];
const COURSES_BY_STREAM: Record<string, string[]> = {
  "Engineering & Technology": ["B.E. / B.Tech", "M.E. / M.Tech", "Diploma in Engineering", "B.Arch", "M.Arch"],
  "Computer Applications & IT": ["BCA", "MCA", "B.Sc. Computer Science", "B.Sc. Information Technology", "B.Sc. Data Science", "B.Sc. Artificial Intelligence"],
  Science: ["B.Sc. Mathematics", "B.Sc. Physics", "B.Sc. Chemistry", "B.Sc. Biology", "B.Sc. Biotechnology", "B.Sc. Statistics"],
  "Commerce & Management": ["B.Com", "BBA", "BBM", "M.Com", "MBA"],
  "Arts & Humanities": ["B.A. English", "B.A. Economics", "B.A. History", "B.A. Psychology", "B.A. Political Science", "M.A."],
  "Design & Media": ["B.Des", "M.Des", "BFA", "BA Media & Communication", "Film & Television"],
  Law: ["LL.B", "B.A. LL.B", "BBA LL.B", "LL.M"],
  "Medicine & Health Sciences": ["MBBS", "BDS", "B.Pharm", "B.Sc. Nursing", "BPT", "Allied Health Sciences"],
  Education: ["B.Ed", "M.Ed", "D.El.Ed", "B.El.Ed"],
  "Agriculture & Life Sciences": ["B.Sc. Agriculture", "B.Sc. Horticulture", "B.Sc. Forestry", "B.Sc. Food Science", "M.Sc. Life Sciences"],
};
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY_PROFILE: Profile = { full_name: "", stream: "", course: "", academic_year: 1, semester: 1, dark_mode: false, monthly_budget: 0, avatar_url: null };

export function ClevoraApp() {
  const navigate = useNavigate({ from: "/app" });
  const [tab, setTab] = useState<Tab>("home");
  const [extra, setExtra] = useState<Extra>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [exams, setExams] = useState<ExamPlan[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState<ComposerType>(null);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) { await navigate({ to: "/auth", replace: true }); return; }
      setUserId(user.id);
      const [profileRes, subjectRes, taskRes, noteRes, attendanceRes, expenseRes, reminderRes, timetableRes, examRes] = await Promise.all([
        supabase.from("profiles").select("full_name,stream,course,academic_year,semester,dark_mode,monthly_budget,avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("subjects").select("id,name,code,color").eq("user_id", user.id).order("name"),
        supabase.from("study_tasks").select("id,title,completed,deadline,scheduled_for,subject_id").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("notes").select("id,title,content,important,subject_id,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("attendance").select("id,subject_id,attended,total").eq("user_id", user.id),
        supabase.from("expenses").select("id,amount,category,description,spent_on").eq("user_id", user.id).order("spent_on", { ascending: false }),
        supabase.from("reminders").select("id,title,reminder_type,subject,due_at,completed").eq("user_id", user.id).order("due_at"),
        supabase.from("timetable_entries").select("id,subject_id,title,day_of_week,start_time,end_time,room").eq("user_id", user.id).order("day_of_week").order("start_time"),
        supabase.from("exam_plans").select("id,subject_id,title,exam_date,start_time,end_time,notes,completed").eq("user_id", user.id).order("exam_date").order("start_time"),
      ]);
      if (profileRes.error && profileRes.error.code !== "PGRST116") console.error(profileRes.error);
      const rawProfile = profileRes.data;
      if (rawProfile) setProfile({ ...EMPTY_PROFILE, ...rawProfile, monthly_budget: Number(rawProfile.monthly_budget) });
      else {
        const name = String(user.user_metadata?.["full_name"] ?? "").trim();
        const next = { ...EMPTY_PROFILE, full_name: name };
        const { error } = await supabase.from("profiles").insert({ user_id: user.id, ...next });
        if (!error) setProfile(next);
      }
      if (!subjectRes.error) setSubjects(subjectRes.data ?? []);
      if (!taskRes.error) setTasks(taskRes.data ?? []);
      if (!noteRes.error) setNotes(noteRes.data ?? []);
      if (!attendanceRes.error) setAttendance(attendanceRes.data ?? []);
      if (!expenseRes.error) setExpenses((expenseRes.data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })));
      if (!reminderRes.error) setReminders(reminderRes.data ?? []);
      if (!timetableRes.error) setTimetable(timetableRes.data ?? []);
      if (!examRes.error) setExams(examRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [navigate]);

  useEffect(() => { document.documentElement.classList.toggle("dark", profile.dark_mode); }, [profile.dark_mode]);

  const subjectName = (id: string | null) => subjects.find((subject) => subject.id === id)?.name ?? "General";
  const avgAttendance = attendance.length ? Math.round(attendance.reduce((sum, item) => sum + (item.total ? item.attended / item.total : 0), 0) / attendance.length * 100) : 0;
  const nextExam = exams.find((exam) => !exam.completed && new Date(`${exam.exam_date}T${exam.start_time}`) >= new Date());
  const searchResults = useMemo(() => {
    const value = query.toLowerCase().trim();
    if (!value) return [];
    return [
      ...tasks.filter((item) => item.title.toLowerCase().includes(value)).map((item) => ({ label: item.title, type: "Task", tab: "planner" as Tab })),
      ...notes.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(value)).map((item) => ({ label: item.title, type: "Note", tab: "notes" as Tab })),
      ...exams.filter((item) => `${item.title} ${item.notes}`.toLowerCase().includes(value)).map((item) => ({ label: item.title, type: "Exam", tab: "planner" as Tab })),
      ...subjects.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(value)).map((item) => ({ label: item.name, type: "Subject", tab: "planner" as Tab })),
    ];
  }, [notes, query, tasks, exams, subjects]);

  async function toggleTask(task: Task) {
    const completed = !task.completed;
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, completed } : item));
    if (!task.id.startsWith("local-")) await supabase.from("study_tasks").update({ completed }).eq("id", task.id);
  }

  async function deleteNote(note: Note) {
    setNotes((items) => items.filter((item) => item.id !== note.id));
    await supabase.from("notes").delete().eq("id", note.id);
    toast.success("Note deleted");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const { error } = await supabase.from("profiles").upsert({ user_id: userId, ...profile }, { onConflict: "user_id" });
    if (error) toast.error(error.message); else toast.success("Profile saved");
  }

  async function uploadAvatar(file: File) {
    if (!userId) return;
    try {
      const dataUrl = await resizeImage(file);
      const { error } = await supabase.from("profiles").upsert({ user_id: userId, avatar_url: dataUrl }, { onConflict: "user_id" });
      if (error) throw error;
      setProfile((p) => ({ ...p, avatar_url: dataUrl }));
      toast.success("Profile image updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update profile image"); }
  }

  async function addAttendanceSession(subjectId: string, attended: boolean) {
    const current = attendance.find((item) => item.subject_id === subjectId);
    if (current) {
      const next = { attended: current.attended + (attended ? 1 : 0), total: current.total + 1 };
      const { error } = await supabase.from("attendance").update(next).eq("id", current.id);
      if (error) { toast.error(error.message); return; }
      setAttendance((items) => items.map((item) => item.id === current.id ? { ...item, ...next } : item));
    } else {
      const { data, error } = await supabase.from("attendance").insert({ user_id: userId, subject_id: subjectId, attended: attended ? 1 : 0, total: 1 }).select("id,subject_id,attended,total").single();
      if (error) { toast.error(error.message); return; }
      setAttendance((items) => [...items, data]);
    }
    toast.success(attended ? "Present session added" : "Absent session added");
  }

  async function toggleExam(exam: ExamPlan) {
    const completed = !exam.completed;
    const { error } = await supabase.from("exam_plans").update({ completed }).eq("id", exam.id);
    if (error) { toast.error(error.message); return; }
    setExams((items) => items.map((item) => item.id === exam.id ? { ...item, completed } : item));
  }

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }

  if (loading) return <div className="clevora-canvas grid min-h-screen place-items-center"><Loader2 className="size-8 animate-spin text-livid" /></div>;

  return (
    <div className="clevora-canvas relative min-h-screen overflow-x-hidden text-foreground">
      <div className="float-one pointer-events-none fixed -right-24 -top-32 h-[420px] w-[280px] rounded-[44px] bg-glass ring-1 ring-glass-border backdrop-blur-2xl" />
      <div className="float-two pointer-events-none fixed -left-28 bottom-24 h-[300px] w-[240px] rounded-[40px] bg-livid-soft/40 ring-1 ring-glass-border backdrop-blur-2xl" />
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-[460px] px-5 pb-28 pt-5">
        <Header profile={profile} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} />
        {extra === "attendance" ? <AttendanceView attendance={attendance} subjects={subjects} subjectName={subjectName} onBack={() => setExtra(null)} onAddForSubject={(subjectId) => addAttendanceSession(subjectId, true)} onAddMissed={(subjectId) => addAttendanceSession(subjectId, false)} />
          : extra === "expenses" ? <ExpensesView expenses={expenses} budget={profile.monthly_budget} onAdd={() => setComposer("expense")} onBack={() => setExtra(null)} />
          : extra === "reminders" ? <RemindersView reminders={reminders} onAdd={() => setComposer("reminder")} onBack={() => setExtra(null)} />
          : tab === "home" ? <HomeView profile={profile} tasks={tasks} attendance={avgAttendance} reminders={reminders} nextExam={nextExam} timetable={timetable} subjectName={subjectName} onOpen={setExtra} onTab={setTab} onToggle={toggleTask} />
          : tab === "planner" ? <PlannerView tasks={tasks} subjects={subjects} exams={exams} timetable={timetable} subjectName={subjectName} onToggle={toggleTask} onAddTask={() => setComposer("task")} onAddSubject={() => setComposer("subject")} onAddExam={() => setComposer("exam")} onAddTimetable={() => setComposer("timetable")} onToggleExam={toggleExam} />
          : tab === "notes" ? <NotesView notes={notes} subjectName={subjectName} onAdd={() => setComposer("note")} onDelete={deleteNote} />
          : tab === "campus" ? <CampusView profile={profile} subjects={subjects} />
          : <ProfileView profile={profile} setProfile={setProfile} onSave={saveProfile} onAvatar={uploadAvatar} onAttendance={() => setExtra("attendance")} onExpenses={() => setExtra("expenses")} onReminders={() => setExtra("reminders")} onSignOut={signOut} />}
      </main>
      <BottomNav tab={tab} onTab={(next) => { setTab(next); setExtra(null); }} onAdd={() => setComposer(tab === "notes" ? "note" : "task")} />
      {searchOpen && <SearchSheet query={query} setQuery={setQuery} results={searchResults} onClose={() => setSearchOpen(false)} onSelect={(next) => { setTab(next); setExtra(null); setSearchOpen(false); }} />}
      {notificationsOpen && <NotificationSheet reminders={reminders} onClose={() => setNotificationsOpen(false)} onOpen={() => { setExtra("reminders"); setNotificationsOpen(false); }} />}
      {composer && <Composer type={composer} userId={userId} subjects={subjects} profile={profile} onClose={() => setComposer(null)} onCreated={(kind, item) => {
        if (kind === "task") setTasks((items) => [item as Task, ...items]);
        if (kind === "note") setNotes((items) => [item as Note, ...items]);
        if (kind === "expense") setExpenses((items) => [item as Expense, ...items]);
        if (kind === "reminder") setReminders((items) => [...items, item as Reminder]);
        if (kind === "subject") setSubjects((items) => [...items, item as Subject]);
        if (kind === "exam") setExams((items) => [...items, item as ExamPlan].sort((a,b) => `${a.exam_date}${a.start_time}`.localeCompare(`${b.exam_date}${b.start_time}`)));
        if (kind === "timetable") setTimetable((items) => [...items, item as TimetableEntry].sort((a,b) => a.day_of_week-b.day_of_week || a.start_time.localeCompare(b.start_time)));
        setComposer(null);
      }} />}
    </div>
  );
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => { const size = 256; const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size; const ctx = canvas.getContext("2d"); if (!ctx) return reject(new Error("Image processing unavailable")); const scale = Math.max(size / image.width, size / image.height); const w = image.width * scale; const h = image.height * scale; ctx.drawImage(image, (size-w)/2, (size-h)/2, w, h); resolve(canvas.toDataURL("image/jpeg", 0.82)); };
      image.onerror = () => reject(new Error("Invalid image")); image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read image")); reader.readAsDataURL(file);
  });
}

function Avatar({ profile, size = "size-11" }: { profile: Profile; size?: string }) {
  const initials = profile.full_name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C";
  return profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" className={`${size} rounded-full object-cover ring-2 ring-glass-border`} /> : <div className={`${size} grid place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-2 ring-glass-border`}>{initials}</div>;
}

function Header({ profile, onSearch, onNotifications }: { profile: Profile; onSearch: () => void; onNotifications: () => void }) {
  return <header className="flex items-center justify-between"><div className="flex min-w-0 items-center gap-3"><Avatar profile={profile} /><div className="min-w-0"><p className="truncate text-sm text-muted-foreground">Hello, <span className="font-semibold text-foreground">{profile.full_name.split(" ")[0] || "Student"}</span></p><p className="text-[13px] font-semibold">{new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "short" }).format(new Date())}</p></div></div><div className="flex gap-1"><Button variant="glass" size="mobileIcon" aria-label="Search" onClick={onSearch}><Search /></Button><Button variant="glass" size="mobileIcon" aria-label="Notifications" className="relative" onClick={onNotifications}><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-livid" /></Button></div></header>;
}
function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) { return <div className="mb-2 mt-5 flex items-center justify-between"><h2 className="font-display text-lg font-bold">{children}</h2>{action}</div>; }

function HomeView({ profile, tasks, attendance, reminders, nextExam, timetable, subjectName, onOpen, onTab, onToggle }: { profile: Profile; tasks: Task[]; attendance: number; reminders: Reminder[]; nextExam?: ExamPlan; timetable: TimetableEntry[]; subjectName: (id: string|null)=>string; onOpen: (view: Extra)=>void; onTab:(tab:Tab)=>void; onToggle:(task:Task)=>void }) {
  const complete = tasks.filter((task) => task.completed).length;
  const today = new Date().getDay();
  const todayClasses = timetable.filter((item) => item.day_of_week === today);
  const quickActions: Array<{ Icon: LucideIcon; label: string; action: () => void; color: string }> = [
    { Icon: NotebookPen, label: "Notes", action: () => onTab("notes"), color: "bg-livid-soft/55" },
    { Icon: CalendarDays, label: "Planner", action: () => onTab("planner"), color: "bg-sage/60" },
    { Icon: GraduationCap, label: "Attendance", action: () => onOpen("attendance"), color: "bg-ice/70" },
    { Icon: WalletCards, label: "Expenses", action: () => onOpen("expenses"), color: "bg-sun/65" },
  ];
  return <>
    <section className="glass-panel relative mt-5 overflow-hidden rounded-[26px] p-5"><div className="absolute -right-10 -top-16 h-40 w-40 rotate-45 rounded-[24px] bg-livid-soft/50" /><div className="relative"><div className="flex justify-between"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Your dashboard</p><span className="text-[11px] text-muted-foreground">{profile.course || "Choose your course"}</span></div><h1 className="mt-2 font-display text-3xl font-extrabold">Clevora</h1><p className="mt-1 text-sm text-muted-foreground">{profile.full_name ? `${profile.full_name.split(" ")[0]}, your academic workspace is ready.` : "Complete your profile to personalize Clevora."}</p><div className="mt-4 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-ice"><div className="h-full rounded-full bg-livid transition-all" style={{ width: `${tasks.length ? complete / tasks.length * 100 : 0}%` }} /></div><span className="text-xs font-semibold">{complete}/{tasks.length}</span></div></div></section>
    <SectionTitle action={<Button variant="link" size="sm" onClick={() => onTab("planner")}>View planner</Button>}>Today</SectionTitle>
    <div className="glass-panel rounded-[22px] p-3">{todayClasses.length ? <div className="space-y-2">{todayClasses.map((item)=><ScheduleCard key={item.id} time={`${item.start_time}–${item.end_time}`} title={item.title} detail={`${subjectName(item.subject_id)}${item.room ? ` · ${item.room}` : ""}`} color="bg-livid-soft/45" />)}</div> : <EmptyState icon={CalendarDays} title="No classes added" detail="Add your timetable entries in Planner." />}</div>
    <SectionTitle>Quick access</SectionTitle><div className="grid grid-cols-4 gap-2">{quickActions.map(({ Icon, label, action, color }) => <Button key={label} variant="ghost" className={`h-20 flex-col rounded-2xl ${color}`} onClick={action}><Icon className="size-5"/><span className="text-[10px]">{label}</span></Button>)}</div>
    <SectionTitle action={<span className="text-xs text-muted-foreground">{complete} of {tasks.length} done</span>}>Focus today</SectionTitle><div className="glass-panel space-y-1 rounded-[22px] p-3">{tasks.length ? tasks.slice(0,3).map((task)=><TaskRow key={task.id} task={task} onToggle={onToggle}/>) : <EmptyState icon={ClipboardList} title="No study tasks" detail="Use the Planner plus button to create your first task." />}</div>
    <section className="mt-5 grid grid-cols-3 gap-2"><StatCard label="Attendance" value={`${attendance}%`} detail="Recorded sessions"/><StatCard label="Next exam" value={nextExam ? formatShortDate(nextExam.exam_date) : "—"} detail={nextExam?.title || "Add an exam"}/><StatCard label="Due soon" value={String(reminders.filter((r) => !r.completed).length)} detail="Your reminders"/></section>
  </>;
}
function ScheduleCard({ time, title, detail, color }: { time: string; title: string; detail: string; color: string }) { return <div className={`rounded-2xl p-3 ${color}`}><span className="text-[11px] font-semibold text-livid">{time}</span><p className="mt-1 text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div>; }
function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="glass-panel rounded-[18px] p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-extrabold">{value}</p><p className="mt-1 truncate text-[10px] text-muted-foreground">{detail}</p></div>; }
function TaskRow({ task, onToggle }: { task: Task; onToggle: (task: Task) => void }) { return <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal rounded-xl px-2 py-2.5 text-left" onClick={() => onToggle(task)}><span className={`grid size-5 shrink-0 place-items-center rounded-md border ${task.completed ? "border-success bg-sage" : "border-border bg-glass-strong"}`}>{task.completed && <Check className="size-3"/>}</span><span className={`text-sm ${task.completed ? "text-muted-foreground line-through" : "font-medium"}`}>{task.title}</span></Button>; }

function PlannerView({ tasks, subjects, exams, timetable, subjectName, onToggle, onAddTask, onAddSubject, onAddExam, onAddTimetable, onToggleExam }: { tasks:Task[]; subjects:Subject[]; exams:ExamPlan[]; timetable:TimetableEntry[]; subjectName:(id:string|null)=>string; onToggle:(task:Task)=>void; onAddTask:()=>void; onAddSubject:()=>void; onAddExam:()=>void; onAddTimetable:()=>void; onToggleExam:(exam:ExamPlan)=>void }) {
  const [view, setView] = useState<"week"|"exams">("week");
  return <section className="mt-6"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase text-livid">Study planner</p><h1 className="font-display text-3xl font-extrabold">Plan your time</h1></div><div className="flex gap-2"><Button variant="glass" size="icon" onClick={onAddTimetable} aria-label="Add timetable entry"><CalendarDays/></Button><Button variant="clevora" size="icon" onClick={onAddTask} aria-label="Add study task"><Plus/></Button></div></div>
    <div className="mt-4 grid grid-cols-2 rounded-xl bg-secondary/65 p-1"><Button variant={view === "week" ? "default" : "ghost"} onClick={()=>setView("week")} className="rounded-lg shadow-none">Weekly planner</Button><Button variant={view === "exams" ? "default" : "ghost"} onClick={()=>setView("exams")} className="rounded-lg shadow-none">Exam planner</Button></div>
    {view === "exams" ? <ExamPlanner exams={exams} subjectName={subjectName} onAdd={onAddExam} onToggle={onToggleExam} /> : <>
      <SectionTitle action={<Button variant="link" size="sm" onClick={onAddSubject}>Add subject</Button>}>Subjects</SectionTitle><div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{subjects.length ? subjects.map((subject,index)=><div key={subject.id} className={`min-w-32 rounded-2xl p-3 ${["bg-livid-soft/55","bg-sage/60","bg-blush/65","bg-sun/65"][index%4]}`}><p className="text-xs text-muted-foreground">{subject.code || "No code"}</p><p className="mt-1 text-sm font-semibold">{subject.name}</p></div>) : <EmptyState icon={BookOpen} title="No subjects" detail="Add the subjects you actually study." />}</div>
      <SectionTitle action={<span className="text-xs text-muted-foreground">Use the plus to add</span>}>Study tasks</SectionTitle><div className="glass-panel space-y-2 rounded-[22px] p-3">{tasks.length ? tasks.map((task)=><div key={task.id}><TaskRow task={task} onToggle={onToggle}/>{task.deadline && <p className="ml-9 text-[10px] text-muted-foreground">{subjectName(task.subject_id)} · Due {new Date(task.deadline).toLocaleDateString()}</p>}</div>) : <EmptyState icon={ClipboardList} title="No tasks yet" detail="Create tasks with real deadlines and subjects." />}</div>
      <SectionTitle action={<Button variant="link" size="sm" onClick={onAddTimetable}>Add class</Button>}>Timetable</SectionTitle><div className="glass-panel rounded-[22px] p-3">{timetable.length ? <div className="space-y-2">{timetable.map((item)=><div key={item.id} className="rounded-xl bg-glass-strong p-3"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold text-livid">{DAYS[item.day_of_week]}</p><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{subjectName(item.subject_id)}{item.room ? ` · ${item.room}` : ""}</p></div><span className="text-xs text-muted-foreground">{item.start_time}–{item.end_time}</span></div></div>)}</div> : <EmptyState icon={CalendarDays} title="No timetable entries" detail="Add timetable entries from your planner." />}</div>
    </>}
  </section>;
}
function ExamPlanner({ exams, subjectName, onAdd, onToggle }: { exams:ExamPlan[]; subjectName:(id:string|null)=>string; onAdd:()=>void; onToggle:(exam:ExamPlan)=>void }) { return <><SectionTitle action={<Button variant="clevora" size="icon" onClick={onAdd} aria-label="Add exam"><Plus/></Button>}>Exam planner</SectionTitle><p className="text-sm text-muted-foreground">Create your own exam schedule and track what is completed.</p><div className="mt-4 space-y-3">{exams.length ? exams.map((exam)=><article key={exam.id} className={`rounded-[20px] p-4 ${exam.completed ? "bg-sage/55" : "bg-blush/65"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{subjectName(exam.subject_id)} · {exam.completed ? "Completed" : "Planned"}</p><h2 className="mt-1 font-display font-bold">{exam.title}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(`${exam.exam_date}T${exam.start_time}`).toLocaleString([], { dateStyle:"medium", timeStyle:"short" })}–{exam.end_time}</p>{exam.notes && <p className="mt-2 text-sm text-muted-foreground">{exam.notes}</p>}</div><Button type="button" variant={exam.completed ? "default" : "glass"} size="icon" className="shrink-0" aria-label={exam.completed ? "Mark exam planned" : "Mark exam completed"} onClick={()=>onToggle(exam)}>{exam.completed ? <Check/> : <Clock3/>}</Button></div></article>) : <EmptyState icon={GraduationCap} title="No exams planned" detail="Use the plus button to add your real exam schedule." />}</div></>; }

function NotesView({ notes, subjectName, onAdd, onDelete }: { notes: Note[]; subjectName:(id:string|null)=>string; onAdd:()=>void; onDelete:(note:Note)=>void }) { const [filter,setFilter]=useState(""); const filtered=notes.filter((note)=>`${note.title} ${note.content} ${subjectName(note.subject_id)}`.toLowerCase().includes(filter.toLowerCase())); return <section className="mt-6"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase text-livid">Study library</p><h1 className="font-display text-3xl font-extrabold">Notes</h1></div><Button variant="clevora" size="icon" onClick={onAdd} aria-label="Create note"><Plus/></Button></div><div className="relative mt-5"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="h-10 rounded-xl bg-glass pl-10 backdrop-blur-xl" placeholder="Search your notes" value={filter} onChange={(e)=>setFilter(e.target.value)}/></div><div className="mt-4 grid gap-3">{filtered.length ? filtered.map((note,index)=><article key={note.id} className={`rounded-[20px] p-4 ${["bg-livid-soft/45","bg-sage/55","bg-blush/55"][index%3]}`}><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{subjectName(note.subject_id)} {note.important && "· Important"}</p><h2 className="mt-1 font-display text-base font-bold">{note.title}</h2></div><Button variant="ghost" size="icon" aria-label="Delete note" onClick={()=>onDelete(note)}><Trash2/></Button></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{note.content}</p></article>) : <EmptyState icon={NotebookPen} title="No notes found" detail={notes.length ? "Try a different search." : "Create your first real note with the plus button."}/>}</div></section>; }

function CampusView({ profile, subjects }: { profile:Profile; subjects:Subject[] }) { return <section className="mt-6"><p className="text-xs font-semibold uppercase text-livid">Your academic space</p><h1 className="font-display text-3xl font-extrabold">Campus</h1><div className="glass-panel mt-5 rounded-[24px] p-5"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Landmark/></div><div><p className="font-semibold">{profile.course || "Course not selected"}</p><p className="text-xs text-muted-foreground">{profile.stream || "Stream not selected"}</p></div></div></div><SectionTitle>Your subjects</SectionTitle><div className="space-y-2">{subjects.length ? subjects.map((subject)=><div key={subject.id} className="glass-panel flex items-center gap-3 rounded-2xl p-3"><BookOpen/><div><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.code || "No code"}</p></div></div>) : <EmptyState icon={BookOpen} title="No subjects yet" detail="Add your actual subjects from Planner."/>}</div><SectionTitle>Study context</SectionTitle><div className="grid grid-cols-2 gap-3"><div className="glass-panel rounded-[20px] p-4"><UsersRound/><p className="mt-5 font-semibold">{profile.stream || "Stream"}</p><p className="text-xs text-muted-foreground">Your selected stream</p></div><div className="glass-panel rounded-[20px] p-4"><CalendarDays/><p className="mt-5 font-semibold">Semester {profile.semester}</p><p className="text-xs text-muted-foreground">Year {profile.academic_year}</p></div></div></section>; }

function ProfileView({profile,setProfile,onSave,onAvatar,onAttendance,onExpenses,onReminders,onSignOut}:{profile:Profile;setProfile:Dispatch<SetStateAction<Profile>>;onSave:(e:FormEvent<HTMLFormElement>)=>void;onAvatar:(file:File)=>void;onAttendance:()=>void;onExpenses:()=>void;onReminders:()=>void;onSignOut:()=>void}) {
  const fileRef=useRef<HTMLInputElement>(null); const courses=COURSES_BY_STREAM[profile.stream] ?? [];
  const tools:Array<{Icon:LucideIcon;label:string;action:()=>void}>=[{Icon:GraduationCap,label:"Attendance",action:onAttendance},{Icon:WalletCards,label:"Expenses",action:onExpenses},{Icon:Bell,label:"Reminders",action:onReminders}];
  return <section className="mt-6"><div className="text-center"><button type="button" className="relative mx-auto block" onClick={()=>fileRef.current?.click()} aria-label="Choose profile image"><Avatar profile={profile} size="size-24"/><span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-canvas-bottom"><ImagePlus className="size-4"/></span></button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const file=e.target.files?.[0]; if(file) onAvatar(file); e.currentTarget.value="";}}/><h1 className="mt-3 font-display text-2xl font-extrabold">{profile.full_name || "Your profile"}</h1><p className="text-sm text-muted-foreground">{profile.course || "Select a course"} · Year {profile.academic_year}</p></div>
    <form onSubmit={onSave} className="glass-panel mt-5 space-y-3 rounded-[24px] p-4"><label className="block text-xs font-semibold">Name<Input className="mt-1 bg-glass-strong" value={profile.full_name} onChange={(e)=>setProfile((p)=>({...p,full_name:e.target.value}))} required/></label>
      <label className="block text-xs font-semibold">Stream<select className="mt-1 h-11 w-full rounded-md border border-input bg-glass-strong px-3 text-sm" value={profile.stream} onChange={(e)=>setProfile((p)=>({ ...p, stream:e.target.value, course:COURSES_BY_STREAM[e.target.value]?.[0] ?? "" }))} required><option value="">Select your stream</option>{STREAMS.map((stream)=><option key={stream} value={stream}>{stream}</option>)}</select></label>
      <label className="block text-xs font-semibold">Course<select className="mt-1 h-11 w-full rounded-md border border-input bg-glass-strong px-3 text-sm" value={profile.course} onChange={(e)=>setProfile((p)=>({...p,course:e.target.value}))} disabled={!profile.stream} required><option value="">{profile.stream ? "Select your course" : "Select stream first"}</option>{courses.map((course)=><option key={course} value={course}>{course}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold">Year<Input className="mt-1 bg-glass-strong" type="number" min="1" max="8" value={profile.academic_year} onChange={(e)=>setProfile((p)=>({...p,academic_year:Number(e.target.value)}))}/></label><label className="block text-xs font-semibold">Semester<Input className="mt-1 bg-glass-strong" type="number" min="1" max="16" value={profile.semester} onChange={(e)=>setProfile((p)=>({...p,semester:Number(e.target.value)}))}/></label></div><label className="block text-xs font-semibold">Monthly budget<Input className="mt-1 bg-glass-strong" type="number" min="0" value={profile.monthly_budget} onChange={(e)=>setProfile((p)=>({...p,monthly_budget:Number(e.target.value)}))}/></label><Button variant="clevora" className="w-full">Save profile</Button></form>
    <SectionTitle>Student tools</SectionTitle><div className="glass-panel divide-y divide-border rounded-[22px]">{tools.map(({Icon,label,action})=><Button key={label} variant="ghost" className="h-14 w-full justify-start rounded-none px-4 first:rounded-t-[22px] last:rounded-b-[22px]" onClick={action}><Icon/><span className="flex-1 text-left">{label}</span><ChevronRight/></Button>)}</div>
    <div className="glass-panel mt-4 flex items-center justify-between rounded-[20px] p-4"><div className="flex items-center gap-3">{profile.dark_mode?<Moon/>:<Sun/>}<div><p className="font-medium">Dark mode</p><p className="text-xs text-muted-foreground">Switch your study atmosphere</p></div></div><Button type="button" variant={profile.dark_mode?"default":"outline"} size="sm" onClick={()=>setProfile((p)=>({...p,dark_mode:!p.dark_mode}))}>{profile.dark_mode?"On":"Off"}</Button></div><Button variant="outline" className="mt-4 w-full" onClick={onSignOut}>Sign out</Button></section>;
}

function AttendanceView({attendance,subjects,subjectName,onBack,onAddForSubject,onAddMissed}:{attendance:Attendance[];subjects:Subject[];subjectName:(id:string|null)=>string;onBack:()=>void;onAddForSubject:(subjectId:string)=>void;onAddMissed:(subjectId:string)=>void}) { return <section><ViewHeader title="Attendance" onBack={onBack}/><p className="mt-2 text-sm text-muted-foreground">Add a session after each real class and mark whether you attended.</p><div className="mt-5 space-y-3">{subjects.length ? subjects.map((subject)=>{const item=attendance.find((a)=>a.subject_id===subject.id); const attended=item?.attended??0; const total=item?.total??0; const pct=total?Math.round(attended/total*100):0; return <article key={subject.id} className="glass-panel rounded-[22px] p-4"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{subject.name}</h2><p className="text-xs text-muted-foreground">{attended} attended · {total} total</p></div><span className={`font-display text-xl font-bold ${pct<75?"text-destructive":"text-success"}`}>{total?`${pct}%`:"—"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className={`${pct<75?"bg-destructive":"bg-success"} h-full`} style={{width:`${Math.min(pct,100)}%`}}/></div><div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><Button variant="glass" onClick={()=>onAddMissed(subject.id)}>Mark missed</Button><Button variant="clevora" size="icon" aria-label={`Add attendance session for ${subject.name}`} onClick={()=>onAddForSubject(subject.id)}><Plus/></Button></div></article>;}) : <EmptyState icon={GraduationCap} title="No subjects to track" detail="Add your real subjects in Planner first."/>}</div></section>; }
function ExpensesView({expenses,budget,onAdd,onBack}:{expenses:Expense[];budget:number;onAdd:()=>void;onBack:()=>void}) { const spent=expenses.reduce((s,e)=>s+Number(e.amount),0); const today=expenses.filter((e)=>e.spent_on===new Date().toISOString().slice(0,10)).reduce((s,e)=>s+Number(e.amount),0); return <section><ViewHeader title="Expenses" onBack={onBack} action={onAdd}/><div className="glass-panel mt-5 rounded-[26px] p-5"><p className="text-xs uppercase text-muted-foreground">Remaining budget</p><p className="mt-2 font-display text-3xl font-extrabold">₹{Math.max(0,budget-spent).toLocaleString()}</p><div className="mt-4 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-livid" style={{width:`${budget?Math.min(100,spent/budget*100):0}%`}}/></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>Today ₹{today.toLocaleString()}</span><span>Month ₹{spent.toLocaleString()}</span></div></div><SectionTitle>Recent spending</SectionTitle><div className="space-y-2">{expenses.length?expenses.map((expense)=><div key={expense.id} className="glass-panel flex items-center gap-3 rounded-2xl p-3"><div className="grid size-10 place-items-center rounded-xl bg-sun/65"><CircleDollarSign/></div><div className="flex-1"><p className="font-medium capitalize">{expense.description||expense.category}</p><p className="text-xs capitalize text-muted-foreground">{expense.category} · {expense.spent_on}</p></div><p className="font-semibold">−₹{Number(expense.amount).toLocaleString()}</p></div>):<EmptyState icon={WalletCards} title="No expenses recorded" detail="Add your actual spending to track your budget."/>}</div></section>; }
function RemindersView({reminders,onAdd,onBack}:{reminders:Reminder[];onAdd:()=>void;onBack:()=>void}) { return <section><ViewHeader title="Reminders" onBack={onBack} action={onAdd}/><p className="mt-2 text-sm text-muted-foreground">Your real exams, assignments and deadlines.</p><div className="mt-5 space-y-3">{reminders.length?reminders.map((reminder)=><article key={reminder.id} className={`rounded-[20px] p-4 ${reminder.reminder_type==="exam"?"bg-blush/65":"bg-sun/65"}`}><div className="flex gap-3"><div className="grid size-10 place-items-center rounded-xl bg-glass"><Clock3/></div><div><p className="text-[10px] font-semibold uppercase text-muted-foreground">{reminder.reminder_type} · {reminder.subject || "General"}</p><h2 className="font-semibold">{reminder.title}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(reminder.due_at).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</p></div></div></article>):<EmptyState icon={Bell} title="No reminders" detail="Add a reminder when you have a real deadline."/>}</div></section>; }
function ViewHeader({title,onBack,action}:{title:string;onBack:()=>void;action?:()=>void}) { return <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back"><ArrowLeft/></Button><h1 className="font-display text-2xl font-extrabold">{title}</h1></div>{action&&<Button variant="clevora" size="icon" onClick={action} aria-label={`Add ${title}`}><Plus/></Button>}</div>; }
function EmptyState({icon:Icon,title,detail}:{icon:LucideIcon;title:string;detail:string}) { return <div className="rounded-[20px] border border-dashed border-border p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-secondary"><Icon className="size-5"/></div><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function formatShortDate(value:string){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(`${value}T12:00:00`));}

function BottomNav({tab,onTab,onAdd}:{tab:Tab;onTab:(tab:Tab)=>void;onAdd:()=>void}) { const items:[[Tab,typeof Home,string],[Tab,typeof Home,string],[Tab,typeof Home,string],[Tab,typeof Home,string],[Tab,typeof Home,string]]=[["home",Home,"Home"],["planner",CalendarDays,"Planner"],["notes",NotebookPen,"Notes"],["campus",Landmark,"Campus"],["profile",UserRound,"Profile"]]; return <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[460px] px-4 pb-4"><div className="glass-panel flex items-center rounded-full p-1.5">{items.map(([value,Icon,label],index)=><div key={value} className="flex flex-1 justify-center">{index===2?<div className="flex flex-col items-center"><Button variant="clevora" size="icon" className="-mt-6 size-12 rounded-full ring-4 ring-canvas-bottom" aria-label="Quick add" onClick={onAdd}><Plus/></Button><Button variant="ghost" className={`h-8 px-2 text-[10px] ${tab===value?"text-livid":"text-muted-foreground"}`} onClick={()=>onTab(value)}>{label}</Button></div>:<Button variant="ghost" className={`h-12 flex-col gap-0.5 px-2 ${tab===value?"text-livid":"text-muted-foreground"}`} onClick={()=>onTab(value)}><Icon className="size-4"/><span className="text-[10px]">{label}</span></Button>}</div>)}</div></nav>; }
function SearchSheet({query,setQuery,results,onClose,onSelect}:{query:string;setQuery:(v:string)=>void;results:{label:string;type:string;tab:Tab}[];onClose:()=>void;onSelect:(t:Tab)=>void}) { return <div className="fixed inset-0 z-50 bg-foreground/20 p-4 backdrop-blur-sm"><div className="glass-panel mx-auto mt-12 max-w-[420px] rounded-[26px] p-4"><div className="flex gap-2"><Input autoFocus className="h-11 bg-glass-strong" placeholder="Search notes, tasks, exams, subjects…" value={query} onChange={(e)=>setQuery(e.target.value)}/><Button variant="ghost" size="icon" onClick={onClose}><X/></Button></div><div className="mt-3 space-y-2">{results.length?results.map((result)=><Button key={`${result.type}-${result.label}`} variant="ghost" className="h-auto w-full justify-start rounded-xl p-3 text-left" onClick={()=>onSelect(result.tab)}><Search/><span><span className="block text-sm font-medium">{result.label}</span><span className="block text-xs text-muted-foreground">{result.type}</span></span></Button>):<p className="py-8 text-center text-sm text-muted-foreground">{query?"No matches found":"Start typing to search Clevora"}</p>}</div></div></div>; }
function NotificationSheet({reminders,onClose,onOpen}:{reminders:Reminder[];onClose:()=>void;onOpen:()=>void}) { return <div className="fixed inset-0 z-50 bg-foreground/20 p-4 backdrop-blur-sm"><div className="glass-panel mx-auto mt-12 max-w-[420px] rounded-[26px] p-4"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Notifications</h2><Button variant="ghost" size="icon" onClick={onClose}><X/></Button></div><div className="mt-3 space-y-2">{reminders.length?reminders.slice(0,3).map((r)=><div key={r.id} className="rounded-xl bg-glass-strong p-3"><p className="text-sm font-medium">{r.title}</p><p className="text-xs text-muted-foreground">Due {new Date(r.due_at).toLocaleDateString()}</p></div>):<p className="py-6 text-center text-sm text-muted-foreground">No reminders yet.</p>}</div><Button variant="clevora" className="mt-4 w-full" onClick={onOpen}>View all reminders</Button></div></div>; }
function Composer({type,userId,subjects,profile,onClose,onCreated}:{type:Exclude<ComposerType,null>;userId:string;subjects:Subject[];profile:Profile;onClose:()=>void;onCreated:(kind:string,item:Task|Note|Expense|Reminder|Subject|ExamPlan|TimetableEntry)=>void}) {
  const [title,setTitle]=useState(""); const [detail,setDetail]=useState(""); const [amount,setAmount]=useState(""); const [date,setDate]=useState(new Date(Date.now()+86400000).toISOString().slice(0,16)); const [subjectId,setSubjectId]=useState(subjects[0]?.id??""); const [day,setDay]=useState(String(new Date().getDay())); const [startTime,setStartTime]=useState("09:00"); const [endTime,setEndTime]=useState("10:00"); const [saving,setSaving]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{
    if(type==="task"){const payload={user_id:userId,title,deadline:new Date(date).toISOString(),subject_id:subjectId||null};const {data,error}=await supabase.from("study_tasks").insert(payload).select("id,title,completed,deadline,scheduled_for,subject_id").single();if(error)throw error;onCreated(type,data);}
    if(type==="note"){const payload={user_id:userId,title,content:detail,important:false,subject_id:subjectId||null};const {data,error}=await supabase.from("notes").insert(payload).select("id,title,content,important,subject_id,updated_at").single();if(error)throw error;onCreated(type,data);}
    if(type==="expense"){const payload={user_id:userId,amount:Number(amount),category:detail||"other",description:title,spent_on:new Date().toISOString().slice(0,10)};const {data,error}=await supabase.from("expenses").insert(payload).select("id,amount,category,description,spent_on").single();if(error)throw error;onCreated(type,{...data,amount:Number(data.amount)});}
    if(type==="reminder"){const payload={user_id:userId,title,subject:detail,reminder_type:"assignment",due_at:new Date(date).toISOString()};const {data,error}=await supabase.from("reminders").insert(payload).select("id,title,reminder_type,subject,due_at,completed").single();if(error)throw error;onCreated(type,data);}
    if(type==="subject"){const payload={user_id:userId,name:title,code:detail,color:"livid"};const {data,error}=await supabase.from("subjects").insert(payload).select("id,name,code,color").single();if(error)throw error;onCreated(type,data);}
    if(type==="exam"){const examDate=date.slice(0,10);const examStart=date.slice(11,16);const payload={user_id:userId,title,subject_id:subjectId||null,exam_date:examDate,start_time:examStart,end_time:endTime,notes:detail,completed:false};const {data,error}=await supabase.from("exam_plans").insert(payload).select("id,subject_id,title,exam_date,start_time,end_time,notes,completed").single();if(error)throw error;onCreated(type,data);}
    if(type==="timetable"){const payload={user_id:userId,title,subject_id:subjectId||null,day_of_week:Number(day),start_time:startTime,end_time:endTime,room:detail||""};const {data,error}=await supabase.from("timetable_entries").insert(payload).select("id,subject_id,title,day_of_week,start_time,end_time,room").single();if(error)throw error;onCreated(type,data);}
    if(type==="attendance"){throw new Error("Choose the attendance session action on the Attendance page.");}
    toast.success(`${type.charAt(0).toUpperCase()+type.slice(1)} added`);
  }catch(error){toast.error(error instanceof Error?error.message:"Could not save");}finally{setSaving(false);}}
  const heading=type==="exam"?"Add exam to planner":type==="timetable"?"Add timetable class":`Add ${type}`;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center"><form onSubmit={submit} className="glass-panel max-h-[88vh] w-full max-w-[420px] overflow-y-auto hide-scrollbar rounded-[26px] p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{heading}</h2><Button type="button" variant="ghost" size="icon" onClick={onClose}><X/></Button></div><div className="mt-4 space-y-3">
    <Input className="h-11 bg-glass-strong" placeholder={type==="subject"?"Subject name":type==="expense"?"What did you buy?":"Title"} value={title} onChange={(e)=>setTitle(e.target.value)} required/>
    {type==="note"||type==="exam"?<Textarea className="min-h-28 bg-glass-strong" placeholder={type==="note"?"Write your note…":"Exam notes or preparation plan"} value={detail} onChange={(e)=>setDetail(e.target.value)} />:<Input className="h-11 bg-glass-strong" placeholder={type==="subject"?"Subject code":type==="expense"?"Category: food, transport…":"Subject or details"} value={detail} onChange={(e)=>setDetail(e.target.value)} />}
    {type==="expense"&&<Input className="h-11 bg-glass-strong" type="number" min="0.01" step="0.01" placeholder="Amount ₹" value={amount} onChange={(e)=>setAmount(e.target.value)} required/>}
    {(type==="task"||type==="note"||type==="exam"||type==="timetable")&&subjects.length>0&&<select className="h-11 w-full rounded-md border border-input bg-glass-strong px-3 text-sm" value={subjectId} onChange={(e)=>setSubjectId(e.target.value)}><option value="">General</option>{subjects.map((s)=><option key={s.id} value={s.id}>{s.name}{s.code?` · ${s.code}`:""}</option>)}</select>}
    {type==="task"||type==="reminder"||type==="exam"?<Input className="h-11 bg-glass-strong" type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)} required/>:null}
    {type==="timetable"&&<><select className="h-11 w-full rounded-md border border-input bg-glass-strong px-3 text-sm" value={day} onChange={(e)=>setDay(e.target.value)}>{DAYS.map((name,index)=><option key={name} value={index}>{name}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input className="h-11 bg-glass-strong" type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} required/><Input className="h-11 bg-glass-strong" type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} required/></div></>}
    {type==="exam"&&<Input className="h-11 bg-glass-strong" type="time" value={endTime} onChange={(e)=>setEndTime(e.target.value)} required/>}
    <Button variant="clevora" className="h-11 w-full" disabled={saving}>{saving&&<Loader2 className="animate-spin"/>}Save</Button></div></form></div>;
}
