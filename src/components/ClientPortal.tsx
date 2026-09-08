import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FolderKanban, 
  ExternalLink, 
  Download, 
  Search, 
  BarChart3, 
  ShieldCheck, 
  Send, 
  Calendar, 
  Building, 
  Phone, 
  Mail, 
  CheckCircle,
  FileSignature,
  Layers,
  ArrowUpRight,
  MessageSquarePlus,
  Loader2
} from "lucide-react";
import { UserProfile, ClientProfile, Project, Task, ContractStatus } from "../types";

interface ClientPortalProps {
  user: UserProfile;
  clients: ClientProfile[];
  projects: Project[];
  tasks: Task[];
  onOpenContractPreview: (data: {
    isOpen: boolean;
    title: string;
    partyName: string;
    contractUrl?: string;
    status: ContractStatus;
    type: "client";
  }) => void;
  onSubmitFeedback?: (message: string, projectId?: string) => Promise<void>;
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function ClientPortal({
  user,
  clients,
  projects,
  tasks,
  onOpenContractPreview,
  onSubmitFeedback,
  showToast,
}: ClientPortalProps) {
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [feedbackProject, setFeedbackProject] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  // Match the logged-in user to their client record
  const currentClient = clients.find(c => 
    (c.email && c.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
    c.id === user.client_id ||
    c.id === user.id ||
    (c.name && user.fullName && c.name.toLowerCase().trim() === user.fullName.toLowerCase().trim())
  ) || {
    id: user.client_id || user.id,
    name: user.fullName || user.email.split("@")[0],
    email: user.email,
    phone: user.phone || "",
    business_type: "عميل الوكالة المعتمد",
    contract_status: user.contract_status || ("ساري" as ContractStatus),
    contract_url: user.contract_url,
    created_at: user.created_at,
  };

  // Find all projects belonging to this client
  const clientProjects = projects.filter(p => 
    p.client_id === currentClient.id ||
    (currentClient.name && p.client_name?.toLowerCase().trim() === currentClient.name.toLowerCase().trim()) ||
    p.client_id === user.id
  );

  // Find all tasks under these projects
  const clientTasks = tasks.filter(t => 
    clientProjects.some(p => p.id === t.project_id)
  );

  // Calculate task statistics
  const completedTasks = clientTasks.filter(t => t.status === "Completed");
  const inProgressTasks = clientTasks.filter(t => t.status === "In Progress");
  const reviewTasks = clientTasks.filter(t => t.status === "Review");
  const revisionsTasks = clientTasks.filter(t => t.status === "Revisions");
  const pendingTasks = clientTasks.filter(t => t.status === "Pending");

  const overallProgress = clientTasks.length > 0
    ? Math.round((completedTasks.length / clientTasks.length) * 100)
    : 0;

  // Filtered tasks for the live feed
  const filteredTasks = clientTasks.filter(t => {
    const matchesStatus = taskFilter === "all" || t.status === taskFilter;
    const matchesProject = selectedProjectId === "all" || t.project_id === selectedProjectId;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.project_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesProject && matchesSearch;
  });

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      if (onSubmitFeedback) {
        await onSubmitFeedback(feedbackText, feedbackProject || undefined);
      } else {
        // Fallback local notifications
        const localNotes = JSON.parse(localStorage.getItem("local_notifications_bypass") || "[]");
        localNotes.unshift({
          id: "notif_" + Math.random().toString(36).substring(2, 9),
          user_id: "admin",
          title: `ملاحظة جديدة من العميل: ${currentClient.name}`,
          message: feedbackText,
          is_read: false,
          created_at: new Date().toISOString()
        });
        localStorage.setItem("local_notifications_bypass", JSON.stringify(localNotes));
      }
      showToast("تم إرسال طلبك وملاحظاتك إلى إدارة فريق العمل بنجاح ✔️", "success");
      setFeedbackText("");
      setShowFeedbackModal(false);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ في الإرسال", "error");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-right">
      
      {/* 1. TOP HERO GREETING BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0b0c10] to-purple-950/30 border border-[#1e2025] rounded-2xl p-6 md:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>بوابة العميل الحصرية • LUMÉRÉ Creative Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              أهلاً بك، <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{currentClient.name}</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              تابع مباشرة نسبة إنجاز مهامك الإبداعية، مراحل تسليم المشاريع، والأصول الرقمية المنجزة من قبل فريق وكالة LUMÉRÉ لحظة بلحظة.
            </p>
          </div>

          {/* Quick Client Summary Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-neutral-900/80 border border-neutral-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
              <Building className="w-4 h-4 text-neutral-400" />
              <div>
                <span className="text-[10px] text-neutral-500 block">نوع النشاط</span>
                <span className="text-xs font-bold text-neutral-200">{currentClient.business_type || "غير محدد"}</span>
              </div>
            </div>

            <div className="bg-neutral-900/80 border border-neutral-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-neutral-500 block">حالة العقد</span>
                <span className="text-xs font-bold text-emerald-400">{currentClient.contract_status || "ساري"}</span>
              </div>
            </div>

            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-950/50 transition cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>طلب تعديل / ملاحظة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. OVERALL COMPLETION RATE & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Massive Progress Meter Card */}
        <div className="lg:col-span-5 bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-white">نسبة إنجاز المهام الكلية</h2>
            </div>
            <span className="text-[11px] bg-neutral-900 text-neutral-400 px-2.5 py-1 rounded-lg border border-neutral-800">
              {completedTasks.length} من {clientTasks.length} مهام
            </span>
          </div>

          <div className="my-6 flex flex-col items-center justify-center text-center">
            {/* Visual Ring Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-neutral-900"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="transition-all duration-1000 ease-out"
                  stroke={overallProgress === 100 ? "#10b981" : overallProgress > 50 ? "#3b82f6" : "#8b5cf6"}
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * overallProgress) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                  {overallProgress}%
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 font-medium">مكتمل حتى الآن</span>
              </div>
            </div>
          </div>

          {/* Progress Bar & Status Text */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">معدل الإتمام الفعلي</span>
              <span className="text-white font-mono font-bold">{completedTasks.length} / {clientTasks.length} مكتملة</span>
            </div>
            <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  overallProgress === 100
                    ? "bg-emerald-500"
                    : overallProgress > 50
                    ? "bg-gradient-to-r from-blue-600 to-cyan-400"
                    : "bg-gradient-to-r from-purple-600 to-blue-500"
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Detail Stat Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-800 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">إجمالي المشاريع الجارية</span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-white font-mono">
                {clientProjects.length}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">مسار إبداعي نشط في الوكالة</p>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-800 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">المهام المكتملة والمنجزة</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                {completedTasks.length}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1">تم تسليمها واعتمادها بنجاح</p>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-800 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">مهام جاري العمل عليها</span>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-blue-400 font-mono">
                {inProgressTasks.length}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">قيد الإنتاج لدى المتخصصين</p>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-800 transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">قيد المراجعة والتدقيق</span>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-purple-400 font-mono">
                {reviewTasks.length + revisionsTasks.length}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">مرحلة الفحص الفني والتعديلات</p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. PROJECTS ROADMAP & PROGRESS SECTION */}
      <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>مشاريعك ومساراتك الإبداعية المتعاقد عليها</span>
            </h2>
            <p className="text-[11px] text-neutral-500 mt-1">
              تفاصيل ونسب إنجاز كل مشروع على حدة مع الروابط ومواعيد التسليم
            </p>
          </div>
          <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-3 py-1 rounded-xl">
            {clientProjects.length} مشروع مسجل
          </span>
        </div>

        {clientProjects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-neutral-850 rounded-xl bg-neutral-950/40">
            <FolderKanban className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-xs text-neutral-400 font-medium">لا توجد مشاريع مسجلة باسمك حالياً</p>
            <p className="text-[10px] text-neutral-600 mt-1">سيقوم فريق العمل بإنشاء وربط مشاريعك فور استكمال الاتفاقية</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {clientProjects.map(proj => {
              const projTasks = tasks.filter(t => t.project_id === proj.id);
              const projCompleted = projTasks.filter(t => t.status === "Completed").length;
              const projProgress = projTasks.length > 0
                ? Math.round((projCompleted / projTasks.length) * 100)
                : 0;

              return (
                <div key={proj.id} className="bg-neutral-950 border border-neutral-850 hover:border-neutral-750 rounded-xl p-5 space-y-4 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] bg-blue-950 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-900/40">
                        {proj.track_type || "مسار إبداعي"}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2">{proj.title}</h3>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xs font-bold text-emerald-400">{proj.budget ? `${proj.budget.toLocaleString('ar-EG')} ج.م` : "—"}</span>
                      {proj.deadline && (
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          التسليم: {new Date(proj.deadline).toLocaleDateString('ar-EG')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Progress Bar */}
                  <div className="space-y-1.5 bg-[#0b0c10] p-3 rounded-lg border border-neutral-900">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 text-[11px]">نسبة إنجاز المشروع</span>
                      <span className="font-mono font-bold text-white text-xs">{projProgress}% ({projCompleted}/{projTasks.length} مهام)</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          projProgress === 100 ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${projProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks Preview Summary */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-neutral-400">المهام التنفيذية لهذا المشروع:</div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {projTasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] bg-neutral-900/60 border border-neutral-850/60 p-2 rounded-lg">
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              t.status === "Completed" ? "bg-emerald-400" :
                              t.status === "In Progress" ? "bg-blue-400" :
                              t.status === "Review" ? "bg-purple-400" :
                              t.status === "Revisions" ? "bg-amber-400" : "bg-neutral-500"
                            }`} />
                            <span className="text-neutral-300 truncate">{t.title}</span>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                            t.status === "Completed" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" :
                            t.status === "In Progress" ? "bg-blue-950 text-blue-400 border border-blue-900/30" :
                            t.status === "Review" ? "bg-purple-950 text-purple-400 border border-purple-900/30" :
                            t.status === "Revisions" ? "bg-amber-950 text-amber-400 border border-amber-900/30" :
                            "bg-neutral-950 text-neutral-400"
                          }`}>
                            {t.status === "Completed" ? "مكتملة ✔️" :
                             t.status === "In Progress" ? "جاري العمل" :
                             t.status === "Review" ? "قيد المراجعة" :
                             t.status === "Revisions" ? "بانتظار تعديلات" : "قيد الانتظار"}
                          </span>
                        </div>
                      ))}
                      {projTasks.length === 0 && (
                        <p className="text-[10px] text-neutral-500 text-center py-2">لا توجد مهام منشأة بعد لهذا المشروع</p>
                      )}
                    </div>
                  </div>

                  {/* Project Drive Link or Attachments if available */}
                  {proj.drive_url && (
                    <a
                      href={proj.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-blue-400 p-2.5 rounded-lg transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح مجلد الأصول والمخرجات السحابية</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. LIVE ALL-TASKS TRACKER TABLE */}
      <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>جدول التتبع التفصيلي لكافة المهام</span>
            </h2>
            <p className="text-[11px] text-neutral-500 mt-1">
              متابعة حالة كل مهمة، الملاحظات الفنية للموظفين، وتفاصيل التسليم
            </p>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث في المهام..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-neutral-950 border border-neutral-850 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 w-40 sm:w-56"
              />
            </div>

            {/* Project Filter Select */}
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">كافة المشاريع</option>
              {clientProjects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5 pb-2">
          <button
            onClick={() => setTaskFilter("all")}
            className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
              taskFilter === "all" ? "bg-blue-600 text-white font-bold" : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900"
            }`}
          >
            الكل ({clientTasks.length})
          </button>
          <button
            onClick={() => setTaskFilter("Completed")}
            className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
              taskFilter === "Completed" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40 font-bold" : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900"
            }`}
          >
            المكتملة ({completedTasks.length})
          </button>
          <button
            onClick={() => setTaskFilter("In Progress")}
            className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
              taskFilter === "In Progress" ? "bg-blue-950 text-blue-400 border border-blue-900/30 font-bold" : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900"
            }`}
          >
            جاري العمل ({inProgressTasks.length})
          </button>
          <button
            onClick={() => setTaskFilter("Review")}
            className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
              taskFilter === "Review" ? "bg-purple-950 text-purple-400 border border-purple-900/30 font-bold" : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900"
            }`}
          >
            قيد المراجعة ({reviewTasks.length})
          </button>
          <button
            onClick={() => setTaskFilter("Revisions")}
            className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
              taskFilter === "Revisions" ? "bg-amber-950 text-amber-400 border border-amber-900/30 font-bold" : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-900"
            }`}
          >
            بانتظار تعديلات ({revisionsTasks.length})
          </button>
        </div>

        {/* Task List Table */}
        <div className="overflow-hidden border border-neutral-900 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-950 text-neutral-400 uppercase border-b border-neutral-900">
              <tr>
                <th className="p-3.5">المهمة</th>
                <th className="p-3.5">المشروع التابع</th>
                <th className="p-3.5">الحالة التنفيذية</th>
                <th className="p-3.5">الموعد النهائي</th>
                <th className="p-3.5">ملاحظات والتسليمات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 bg-[#0b0c10]">
              {filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-neutral-950/60 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-white">{t.title}</div>
                    <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                      مسؤولة من: {t.assigned_to_name || "فريق الإبداع"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-neutral-300 font-medium">{t.project_title}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      t.status === "Completed" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" :
                      t.status === "In Progress" ? "bg-blue-950 text-blue-400 border border-blue-900/40" :
                      t.status === "Review" ? "bg-purple-950 text-purple-400 border border-purple-900/40" :
                      t.status === "Revisions" ? "bg-amber-950 text-amber-400 border border-amber-900/40" :
                      "bg-neutral-900 text-neutral-400"
                    }`}>
                      {t.status === "Completed" && <CheckCircle2 className="w-3 h-3" />}
                      {t.status === "In Progress" && <Clock className="w-3 h-3" />}
                      {t.status === "Review" && <Layers className="w-3 h-3" />}
                      <span>
                        {t.status === "Completed" ? "مكتملة ومعتمدة" :
                         t.status === "In Progress" ? "جاري العمل عليها" :
                         t.status === "Review" ? "قيد المراجعة الفنية" :
                         t.status === "Revisions" ? "تعديلات مطلوبة" : "قيد التجهيز"}
                      </span>
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-neutral-400 text-[11px]">
                    {t.deadline ? new Date(t.deadline).toLocaleDateString('ar-EG') : "—"}
                  </td>
                  <td className="p-3.5">
                    {t.delivery_notes ? (
                      <div className="bg-neutral-950 border border-neutral-850 p-2 rounded-lg text-[11px] text-neutral-300 max-w-xs leading-relaxed">
                        {t.delivery_notes}
                      </div>
                    ) : (
                      <span className="text-neutral-600 text-[10px]">لا توجد ملاحظات تسليم بعد</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    لا توجد مهام تطابق معايير البحث المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. CONTRACT & LEGAL STATUS */}
      <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">عقد الاتفاق الرقمي الموثق للعميل</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              حالة العقد القانوني للخدمات: <span className="text-emerald-400 font-bold">{currentClient.contract_status || "ساري"}</span>
            </p>
          </div>
        </div>

        {currentClient.contract_url ? (
          <button
            onClick={() => onOpenContractPreview({
              isOpen: true,
              title: `عقد اتفاق الخدمات - ${currentClient.name}`,
              partyName: currentClient.name,
              contractUrl: currentClient.contract_url,
              status: currentClient.contract_status || "ساري",
              type: "client"
            })}
            className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>معاينة العقد الرقمي المعتمد</span>
          </button>
        ) : (
          <span className="text-xs text-neutral-500">تم توثيق الاتفاقية رقمياً من قِبل إدارة الوكالة</span>
        )}
      </div>

      {/* FEEDBACK / REVISION MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl w-full max-w-lg p-6 space-y-4 text-right animate-scale-in">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-blue-400" />
                <span>إرسال ملاحظة أو طلب تعديل للإدارة</span>
              </h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-neutral-500 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">المشروع المرتبط (اختياري)</label>
                <select
                  value={feedbackProject}
                  onChange={e => setFeedbackProject(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">-- ملاحظة عامة على كافة المشاريع --</option>
                  {clientProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">اكتب تفاصيل التعديل أو الملاحظة *</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="مثال: يرجى تعديل الألوان في المشهد الأول، أو تسريع موعد تسليم الفيديو..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="bg-neutral-900 hover:bg-neutral-850 text-neutral-400 text-xs px-4 py-2.5 rounded-xl border border-neutral-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  {submittingFeedback && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال التنبيه للإدارة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
