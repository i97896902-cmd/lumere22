import React, { useState } from "react";
import { 
  X, 
  Send, 
  Link as LinkIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Info
} from "lucide-react";
import { Task } from "../types";

interface TaskDeliveryModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSubmit: (taskId: string, deliveryNotes: string) => Promise<void>;
  isAdmin?: boolean;
}

export default function TaskDeliveryModal({
  isOpen,
  task,
  onClose,
  onSubmit,
  isAdmin = false
}: TaskDeliveryModalProps) {
  if (!isOpen || !task) return null;

  const [notes, setNotes] = useState(task.delivery_notes || "");
  const [driveLink, setDriveLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Combine notes and drive link if provided
    let finalDeliveryNotes = notes.trim();
    if (driveLink.trim()) {
      finalDeliveryNotes = finalDeliveryNotes 
        ? `${finalDeliveryNotes}\n\n🔗 رابط الأصول/الملفات: ${driveLink.trim()}`
        : `🔗 رابط الأصول/الملفات: ${driveLink.trim()}`;
    }

    if (!finalDeliveryNotes) {
      setError("يرجى إدخال تفاصيل ما تم إنجازه أو رابط الأصول والمخرجات لتأكيد التسليم.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(task.id, finalDeliveryNotes);
      onClose();
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ تسليم المهمة، يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0b0c10] border border-[#1e2025] rounded-2xl shadow-2xl overflow-hidden text-right">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-900 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تسليم وإنجاز المهمة الفنية</h3>
              <p className="text-[11px] text-neutral-400">إرسال المخرجات وروابط العمل للإدارة للاعتماد</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={submitting}
            className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Target Task Summary Card */}
          <div className="p-3.5 bg-neutral-950/80 border border-neutral-900 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">المهمة المراد تسليمها:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900/40 font-mono">
                {task.deadline ? `الموعد: ${task.deadline}` : "بدون موعد محدد"}
              </span>
            </div>
            <div className="text-xs font-bold text-white leading-snug">{task.title}</div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <span>المشروع التابع له:</span>
              <span className="text-blue-400 font-semibold">{task.project_title}</span>
            </div>
          </div>

          {/* Guidelines / Helper Info */}
          <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl flex items-start gap-2.5 text-[11px] text-neutral-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              عند إرسال التسليم، سيتم تحويل حالة المهمة فوراً إلى <span className="text-emerald-400 font-bold">مكتملة</span> وتحديث مؤشرات إنجازك وإرسال إشعار فوري لمدير النظام لفحص واعتماد المخرجات.
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5 flex items-center justify-between">
                <span>تقرير الإنجاز وملاحظات التسليم *</span>
                <span className="text-[10px] text-neutral-500 font-normal">مطلوب</span>
              </label>
              <textarea
                required
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="اكتب هنا تفاصيل ما تم تنفيذه، التعديلات المنجزة، أو أي ملاحظات فنية تود إيصالها للمدير والعميل..."
                className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none transition leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3 text-neutral-400" />
                  <span>رابط مجلد الأصول / Google Drive / Dropbox / Figma</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-normal">اختياري</span>
              </label>
              <input
                type="url"
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/... أو https://www.figma.com/..."
                className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none transition font-mono"
              />
            </div>
          </div>

          {/* Quick preset suggestions */}
          <div>
            <span className="text-[10px] text-neutral-500 block mb-1.5">نماذج ملاحظات جاهزة للاستخدام السريع:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNotes("تم الانتهاء من كافة المهام المطلوبة ورفع الأصول النهائية بدقة عالية.")}
                className="text-[10px] bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 px-2.5 py-1 rounded-lg border border-neutral-800 transition"
              >
                + إنجاز كامل ورفع الأصول
              </button>
              <button
                type="button"
                onClick={() => setNotes("تم الانتهاء من المونتاج وتصحيح الألوان وجاهز للمراجعة الفنية والعرض.")}
                className="text-[10px] bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 px-2.5 py-1 rounded-lg border border-neutral-800 transition"
              >
                + جاهز للمراجعة الفنية
              </button>
              <button
                type="button"
                onClick={() => setNotes("تم تطبيق كافة التعديلات والملاحظات المطلوبة من العميل والإدارة بدقة.")}
                className="text-[10px] bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 px-2.5 py-1 rounded-lg border border-neutral-800 transition"
              >
                + تم تطبيق التعديلات
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-900">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-neutral-900 hover:bg-neutral-850 text-xs text-neutral-300 px-4 py-2.5 rounded-xl border border-neutral-800 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-950/50 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>جاري التسليم...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التسليم الفني للمهمة</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
