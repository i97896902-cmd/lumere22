import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  FolderKanban, 
  CheckCircle2, 
  Camera, 
  User, 
  AlertTriangle,
  Layers,
  Filter
} from "lucide-react";
import { Project, Task, EquipmentItem } from "../types";

interface CalendarViewProps {
  projects: Project[];
  tasks: Task[];
  equipment: EquipmentItem[];
  onSelectProject?: (projectId: string) => void;
}

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", 
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const WEEKDAY_NAMES = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
];

export default function CalendarView({
  projects,
  tasks,
  equipment,
  onSelectProject
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | "projects" | "tasks" | "equipment">("all");
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dayString: string; events: any[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar matrix calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggregate events into a map key: "YYYY-MM-DD"
  const eventsByDate = new Map<string, Array<{
    id: string;
    type: "project" | "task" | "equipment";
    title: string;
    subtitle?: string;
    status?: string;
    urgency?: "normal" | "urgent" | "completed";
  }>>();

  const addEvent = (dateStr: string, event: any) => {
    if (!dateStr) return;
    const cleanDate = dateStr.trim();
    if (!eventsByDate.has(cleanDate)) {
      eventsByDate.set(cleanDate, []);
    }
    eventsByDate.get(cleanDate)!.push(event);
  };

  // 1. Add Project Deadlines
  if (eventTypeFilter === "all" || eventTypeFilter === "projects") {
    projects.forEach(p => {
      if (p.deadline) {
        addEvent(p.deadline, {
          id: "proj_" + p.id,
          type: "project",
          title: `مشروع: ${p.title}`,
          subtitle: `العميل: ${p.client_name} (${p.track_type})`,
          urgency: "urgent"
        });
      }
    });
  }

  // 2. Add Task Deadlines
  if (eventTypeFilter === "all" || eventTypeFilter === "tasks") {
    tasks.forEach(t => {
      if (t.deadline) {
        const isCompleted = t.status === "Completed";
        addEvent(t.deadline, {
          id: "task_" + t.id,
          type: "task",
          title: `مهمة: ${t.title}`,
          subtitle: `المسؤول: ${t.assigned_to_name} | المشروع: ${t.project_title}`,
          status: t.status,
          urgency: isCompleted ? "completed" : "normal"
        });
      }
    });
  }

  // 3. Add Equipment Return Dates
  if (eventTypeFilter === "all" || eventTypeFilter === "equipment") {
    equipment.forEach(e => {
      if (e.status === "قيد الاستخدام" && e.return_date) {
        addEvent(e.return_date, {
          id: "eq_" + e.id,
          type: "equipment",
          title: `إرجاع معدة: ${e.name}`,
          subtitle: `المستلم: ${e.assigned_to_name || "غير محدد"}`,
          urgency: "urgent"
        });
      }
    });
  }

  // Build grid days
  const calendarDays = [];
  // Empty slots before month start
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ dayNumber: null, dateStr: null });
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    calendarDays.push({ dayNumber: day, dateStr });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950 p-4 sm:p-6 rounded-2xl border border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>التقويم التفاعلي للجلسات والمهام</span>
              <span className="text-xs bg-blue-950 text-blue-400 border border-blue-900/40 px-2.5 py-0.5 rounded-full font-bold">
                {MONTH_NAMES[month]} {year}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">تتبع المواعيد النهائية للمشاريع، الجلسات، تسليمات المهام وتواريخ إرجاع المعدات</p>
          </div>
        </div>

        {/* Filters & Month Nav Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-850">
            <button
              onClick={() => setEventTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                eventTypeFilter === "all" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setEventTypeFilter("projects")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                eventTypeFilter === "projects" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              المشاريع
            </button>
            <button
              onClick={() => setEventTypeFilter("tasks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                eventTypeFilter === "tasks" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              المهام
            </button>
            <button
              onClick={() => setEventTypeFilter("equipment")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                eventTypeFilter === "equipment" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              المعدات
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-850">
            <button
              onClick={prevMonth}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
              title="الشهر السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-bold text-blue-400 hover:text-white transition"
            >
              اليوم
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-neutral-900 bg-neutral-900/60 text-center py-3 text-xs font-bold text-neutral-400">
          {WEEKDAY_NAMES.map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr gap-px bg-neutral-900/40">
          {calendarDays.map((cell, index) => {
            if (!cell.dayNumber) {
              return <div key={`empty_${index}`} className="bg-neutral-950/40 min-h-[100px] sm:min-h-[120px]" />;
            }

            const dayEvents = eventsByDate.get(cell.dateStr!) || [];
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDayEvents({ dayString: cell.dateStr!, events: dayEvents });
                  }
                }}
                className={`min-h-[100px] sm:min-h-[125px] p-2 bg-neutral-950 transition-colors flex flex-col justify-between group border-b border-l border-neutral-900/50 ${
                  isToday ? "ring-2 ring-blue-500/60 inset-0 z-10 bg-blue-950/10" : "hover:bg-neutral-900/40"
                } ${dayEvents.length > 0 ? "cursor-pointer" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isToday 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/50" 
                        : "text-neutral-400 group-hover:text-white"
                    }`}>
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900/40">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Events list preview */}
                  <div className="space-y-1 overflow-hidden max-h-[85px]">
                    {dayEvents.slice(0, 2).map((ev, i) => (
                      <div
                        key={ev.id + i}
                        className={`text-[10px] font-semibold px-2 py-1 rounded truncate border ${
                          ev.type === "project"
                            ? "bg-purple-950/80 text-purple-300 border-purple-850"
                            : ev.type === "equipment"
                            ? "bg-amber-950/80 text-amber-300 border-amber-850"
                            : ev.urgency === "completed"
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/40"
                            : "bg-blue-950/80 text-blue-300 border-blue-850"
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[9px] text-neutral-500 font-bold text-center">
                        +{dayEvents.length - 2} مواعيد أخرى...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Events Details Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-500" />
                  <span>مواعيد يوم ({selectedDayEvents.dayString})</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">إجمالي المواعيد المسجلة: {selectedDayEvents.events.length}</p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayEvents.events.map((ev, i) => (
                <div
                  key={ev.id + i}
                  className="p-4 rounded-xl border bg-neutral-950 border-neutral-850 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      ev.type === "project"
                        ? "bg-purple-950 text-purple-400 border-purple-900/40"
                        : ev.type === "equipment"
                        ? "bg-amber-950 text-amber-400 border-amber-900/40"
                        : "bg-blue-950 text-blue-400 border-blue-900/40"
                    }`}>
                      {ev.type === "project" ? "موعد مشروع" : ev.type === "equipment" ? "إرجاع معدة" : "موعد مهمة"}
                    </span>
                    {ev.status && (
                      <span className="text-[10px] text-neutral-400 font-semibold">{ev.status}</span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                  {ev.subtitle && (
                    <p className="text-xs text-neutral-400">{ev.subtitle}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-800">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-800 text-white hover:bg-neutral-750 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
