import React, { useState } from "react";
import { 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  X, 
  Loader2, 
  Send,
  ExternalLink,
  Lock,
  UserCheck,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { ClientProfile } from "../types";
import { openWhatsAppMessage, getClientAccountWhatsAppTemplate } from "../lib/whatsapp";

interface ClientAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile | null;
  onSaveAccount: (client: ClientProfile, password: string) => Promise<void>;
  onDeleteAccount?: (client: ClientProfile) => Promise<void>;
  onDeleteClient?: (client: ClientProfile) => Promise<void>;
  onTestLogin?: (client: ClientProfile) => void;
  onTestLoginAsClient?: (client: ClientProfile) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function ClientAccountModal({
  isOpen,
  onClose,
  client,
  onSaveAccount,
  onDeleteAccount,
  onDeleteClient,
  onTestLogin,
  onTestLoginAsClient,
  showToast,
}: ClientAccountModalProps) {
  if (!isOpen || !client) return null;

  const testLoginHandler = onTestLogin || onTestLoginAsClient;

  // Retrieve current stored credentials if available
  const localCreds = JSON.parse(localStorage.getItem("local_profiles_credentials") || "{}");
  const existingCred = localCreds[client.email?.toLowerCase().trim()];
  const currentPassword = existingCred?.password || client.password || "client123";

  const [password, setPassword] = useState<string>(currentPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let gen = "Clt-";
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    showToast("تم توليد كلمة مرور قوية جديدة", "success");
  };

  const handleCopyCredentials = () => {
    const credText = `مرحباً ${client.name}،
تم تفعيل حسابك في بوابة وكالة LUMÉRÉ لمتابعة نسبة إنجاز مهامك ومشاريعك الإبداعية:
🔗 رابط المنصة: ${window.location.origin}
📧 البريد الإلكتروني: ${client.email}
🔑 كلمة المرور: ${password}

يمكنك الآن تسجيل الدخول مباشرة ومتابعة تسليماتك.`;

    navigator.clipboard.writeText(credText);
    setCopied(true);
    showToast("تم نسخ بيانات الدخول بالكامل للحافظة جاهزة للإرسال ✔️", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      showToast("يرجى كتابة كلمة المرور", "error");
      return;
    }
    setSaving(true);
    try {
      await onSaveAccount(client, password);
      showToast(`تم حفظ وتفعيل حساب العميل (${client.name}) بنجاح ✔️`, "success");
      onClose();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ في حفظ الحساب", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountOnly = async () => {
    if (!onDeleteAccount) return;
    setDeletingAccount(true);
    try {
      await onDeleteAccount(client);
      onClose();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حذف حساب العميل", "error");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteClientEntirely = async () => {
    if (!onDeleteClient) return;
    try {
      await onDeleteClient(client);
      onClose();
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حذف العميل", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0c10] border border-[#1e2025] rounded-2xl w-full max-w-lg p-6 space-y-5 text-right animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إدارة حساب الدخول للعميل</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">تفعيل، تعديل، أو حذف بيانات الدخول لبوابة العميل (منفصلة تماماً عن الموظفين)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client Info Card */}
        <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white">{client.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                client.has_account 
                  ? "bg-purple-950 text-purple-400 border-purple-900/40" 
                  : "bg-neutral-900 text-neutral-500 border-neutral-800"
              }`}>
                {client.has_account ? "حساب البوابة مفعل 🔑" : "لا يوجد حساب دخول"}
              </span>
              <span className="text-[10px] bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded border border-neutral-800">
                {client.business_type || "عميل"}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2">
            <span>البريد المعتمد:</span>
            <span className="text-blue-400 font-bold">{client.email}</span>
          </div>
          {client.phone && (
            <div className="text-[11px] text-neutral-500 font-mono">
              هاتف العميل: {client.phone}
            </div>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-neutral-300">
                كلمة مرور حساب العميل (Portal Password) *
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>توليد كلمة سر تلقائية</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-xl pr-4 pl-10 py-2.5 text-xs text-white font-mono text-left focus:outline-none"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-2.5 text-neutral-500 hover:text-neutral-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              سيتمكن العميل من تسجيل الدخول باستخدام بريده الإلكتروني وكلمة المرور هذه فوراً للاطلاع على نسبة الإنجاز والمهام.
            </p>
          </div>

          {/* Quick Copy & WhatsApp Send Preview */}
          <div className="p-3 bg-neutral-900/50 border border-neutral-850 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-neutral-300 text-xs truncate">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">رسالة الترحيب وبيانات الدخول للعميل</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const msg = `مرحباً ${client.name} 👋🏼
تم تفعيل حسابك في بوابة وكالة *LUMÉRÉ* لمتابعة نسبة إنجاز مهامك ومشاريعك الإبداعية:
🔗 رابط المنصة: ${window.location.origin}
📧 البريد الإلكتروني: ${client.email}
🔑 كلمة المرور: ${password}`;
                  
                  if (client.phone) {
                    let clean = client.phone.replace(/[^0-9]/g, "");
                    if (clean.startsWith("01") && clean.length === 11) clean = "20" + clean.substring(1);
                    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                    showToast("تم فتح WhatsApp لإرسال بيانات الدخول للعميل 💬", "success");
                  } else {
                    showToast("يرجى التأكد من رقم هاتف العميل", "error");
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="إرسال رسالة ترحيبية فورية بالواتساب"
              >
                <span>واتساب 💬</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  copied
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ!" : "نسخ الرسالة"}</span>
              </button>
            </div>
          </div>

          {/* Account Management Operations (Delete Account / Delete Client) */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-900">
            <div className="flex items-center gap-2">
              {client.has_account && onDeleteAccount && (
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={handleDeleteAccountOnly}
                  className="text-xs text-amber-400 hover:text-amber-300 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-900/40 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="إلغاء صلاحية تسجيل الدخول للعميل وحذف بيانات الحساب فقط"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>إلغاء/حذف حساب الدخول</span>
                </button>
              )}

              {onDeleteClient && (
                <button
                  type="button"
                  onClick={handleDeleteClientEntirely}
                  className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="حذف ملف العميل وحسابه بالكامل من النظام"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف العميل وحسابه 🗑️</span>
                </button>
              )}
            </div>

            {testLoginHandler && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  testLoginHandler(client);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>دخول تجريبي كـ {client.name}</span>
              </button>
            )}
          </div>

          {/* WhatsApp Send Credentials Button */}
          {client.has_account && client.phone && (
            <button
              type="button"
              onClick={() => {
                const template = getClientAccountWhatsAppTemplate({
                  clientName: client.name,
                  email: client.email,
                  password: password
                });
                openWhatsAppMessage(client.phone, template);
                showToast(`تم فتح واتساب لإرسال بيانات الدخول لـ ${client.name}`, "success");
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-500/20 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>إرسال بيانات الدخول عبر واتساب</span>
            </button>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-900">
            <button
              type="button"
              onClick={onClose}
              className="bg-neutral-900 hover:bg-neutral-850 text-neutral-400 text-xs px-4 py-2 rounded-xl border border-neutral-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>حفظ وتفعيل الحساب</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

