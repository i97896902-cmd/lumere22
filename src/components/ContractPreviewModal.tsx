import { X, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Download, Printer } from "lucide-react";
import { ContractStatus } from "../types";

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  partyName: string;
  contractUrl?: string;
  status: ContractStatus;
  type: "employee" | "client";
}

export default function ContractPreviewModal({
  isOpen,
  onClose,
  title,
  partyName,
  contractUrl,
  status,
  type,
}: ContractPreviewModalProps) {
  if (!isOpen) return null;

  const getStatusDetails = (status: ContractStatus) => {
    switch (status) {
      case "ساري":
        return {
          label: "ساري العمل به",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case "منتهي":
        return {
          label: "منتهي / بحاجة لتجديد",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
        };
      case "قيد التوقيع":
        return {
          label: "قيد التوقيع والمراجعة",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          icon: <Clock className="w-5 h-5 text-amber-400" />,
        };
      default:
        return {
          label: "غير معروف",
          color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
          icon: <Clock className="w-5 h-5 text-gray-400" />,
        };
    }
  };

  const statusInfo = getStatusDetails(status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{title}</h3>
              <p className="text-xs text-neutral-400">معاينة الأرشيف القانوني الرقمي لـ LUMÉRÉ</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto space-y-6">
          
          {/* Top Status & Party details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
            <div>
              <span className="text-xs text-neutral-400 block mb-1">الطرف الثاني</span>
              <span className="text-sm font-semibold text-white">{partyName}</span>
            </div>
            <div>
              <span className="text-xs text-neutral-400 block mb-1">حالة العقد القانوني</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Simulated Document Layout */}
          <div className="border border-neutral-800 bg-neutral-950 p-6 md:p-8 rounded-lg shadow-inner font-sans relative overflow-hidden print-card">
            
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
              <span className="text-9xl font-bold tracking-widest text-blue-500">LUMÉRÉ</span>
            </div>

            {/* Contract Body */}
            <div className="relative space-y-6 text-neutral-300 text-sm leading-relaxed text-justify">
              <div className="text-center pb-4 border-b border-neutral-800">
                <h4 className="text-xl font-bold text-white mb-1">عقد اتفاق وتقديم خدمات إنتاج تقني وإعلامي</h4>
                <p className="text-xs text-neutral-500">نظام لو مير الذكي لإدارة عقود وكالات الإنتاج والتقنية</p>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">التمهيد والطرف الأول:</p>
                <p>
                  إنه في يوم الأحد الموافق 5 يوليو 2026، تم الاتفاق والتعاقد بين كل من:
                  <br />
                  <strong className="text-blue-400">الطرف الأول:</strong> شركة <strong className="text-white">LUMÉRÉ للإنتاج الإعلامي والتقني</strong> ومقرها الإداري العام، ويمثلها المدير العام للوكالة.
                  <br />
                  <strong className="text-blue-400">الطرف الثاني:</strong> السيد/السيدة <strong className="text-white">{partyName}</strong> بصفته ({type === "employee" ? "موظف تقني/إنتاجي متخصص" : "عميل مستفيد من الخدمات"}).
                </p>
              </div>

              <div>
                <p className="font-semibold text-white mb-2">البند الأول - طبيعة التعاقد:</p>
                {type === "employee" ? (
                  <p>
                    بموجب هذا العقد يلتزم الطرف الثاني بتقديم كافة الخدمات الإبداعية والتنفيذية وفقاً لتخصصه المعتمد في نظام LUMÉRÉ، والالتزام الكامل بمواعيد تسليم المشاريع وجودتها والسرية التامة لبيانات العملاء والأصول الإبداعية.
                  </p>
                ) : (
                  <p>
                    بموجب هذا العقد يلتزم الطرف الأول (الشركة) بتسليم مسار المشروع الإبداعي المتفق عليه (سواء كان تصوير، مونتاج، أو بناء سيستم/منصة متكاملة) بجودة إنتاجية عالية، مع توفير روابط الأصول الفنية المتفق عليها، مقابل الالتزام المالي المحدد بالميزانية المعتمدة.
                  </p>
                )}
              </div>

              <div>
                <p className="font-semibold text-white mb-2">البند الثاني - الالتزام القانوني والسرية:</p>
                <p>
                  يقر الطرفان بالالتزام بالسرية المطلقة وعدم إفشاء أي أسرار تقنية أو مالية أو فنية تخص مشاريع الوكالة أو عملائها، ويعتبر أي إخلال بهذا البند سبباً لإنهاء التعاقد فوراً دون إنذار مع حق المطالبة بالتعويض المالي المناسب.
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-800 grid grid-cols-2 text-center gap-4 text-xs text-neutral-500">
                <div>
                  <p className="mb-8 font-semibold text-neutral-400">توقيع الطرف الأول (LUMÉRÉ)</p>
                  <p className="text-blue-500 font-mono text-[10px]">LUMÉRÉ DIGITAL SECURE SIGNED</p>
                </div>
                <div>
                  <p className="mb-8 font-semibold text-neutral-400">توقيع الطرف الثاني ({partyName})</p>
                  <p className="text-neutral-400 font-mono text-[10px]">{status === "ساري" ? "E-SIGNED & VERIFIED" : "PENDING_SIGNATURE"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* External URL Indicator */}
          {contractUrl && (
            <div className="text-xs text-neutral-400 flex items-center justify-between bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span>رابط العقد الخارجي المرفوع:</span>
              <a 
                href={contractUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:underline hover:text-blue-300 break-all"
              >
                {contractUrl}
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between no-print">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition"
            >
              <Printer className="w-4 h-4" />
              طباعة العقد (PDF)
            </button>
            {contractUrl && (
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition"
              >
                <Download className="w-4 h-4" />
                تحميل الملف المرفق
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
          >
            إغلاق المعاينة
          </button>
        </div>

      </div>
    </div>
  );
}
