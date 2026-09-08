import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  UserSquare, 
  WalletCards, 
  User, 
  LogOut,
  HelpCircle,
  Activity,
  X
} from "lucide-react";
import { UserProfile } from "../types";

interface SidebarProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, isOpen = false, onClose }: SidebarProps) {
  const isAdmin = user.role === "admin";
  const isClient = user.role === "client";

  const menuItems = [
    {
      id: "dashboard",
      label: isClient ? "بوابة العميل وإنجاز المهام" : "لوحة القيادة",
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowed: true,
    },
    {
      id: "clients",
      label: "إدارة العملاء",
      icon: <Users className="w-5 h-5" />,
      allowed: isAdmin,
    },
    {
      id: "projects",
      label: isClient ? "مشاريعي ومخرجاتها" : "المشاريع والمهام",
      icon: <FolderKanban className="w-5 h-5" />,
      allowed: true, // Employees and Clients see their own projects and tasks
    },
    {
      id: "employees",
      label: "الموظفين",
      icon: <UserSquare className="w-5 h-5" />,
      allowed: isAdmin,
    },
    {
      id: "finances",
      label: "الحسابات والمرتبات",
      icon: <WalletCards className="w-5 h-5" />,
      allowed: isAdmin,
    },
    {
      id: "system-test",
      label: "اختبار الضغط والتحمل",
      icon: <Activity className="w-5 h-5" />,
      allowed: isAdmin,
    },
    {
      id: "profile",
      label: "الملف الشخصي",
      icon: <User className="w-5 h-5" />,
      allowed: true,
    },
  ];

  const getRoleBadge = () => {
    if (isAdmin) return "مسؤول عام";
    if (isClient) return "عميل معتمد";
    return "فريق العمل";
  };

  const getUserSubtitle = () => {
    if (isAdmin) return "إدارة الوكالة";
    if (isClient) return user.fullName || "عميل الوكالة";
    return user.specialization || "تخصص معلق";
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside 
        id="sidebar-menu" 
        className={`w-72 sm:w-64 bg-neutral-950 border-l border-neutral-900 flex flex-col h-screen fixed right-0 top-0 text-right no-print z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 shadow-2xl" : "max-lg:translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-widest text-white font-sans">
              LUMÉRÉ
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isClient 
                ? "bg-purple-950 text-purple-400 border-purple-900/40" 
                : "bg-blue-950 text-blue-400 border-blue-900/40"
            }`}>
              {getRoleBadge()}
            </span>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 lg:hidden transition"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* User Quick Info */}
        <div className="p-4 mx-4 my-3 bg-neutral-900/50 border border-neutral-900/80 rounded-xl flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-lg ${
            isClient 
              ? "bg-purple-600/10 border-purple-500/20 text-purple-400"
              : "bg-blue-600/10 border-blue-500/20 text-blue-500"
          }`}>
            {(user.fullName?.[0] || user.email[0] || "C").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-neutral-400 truncate">{user.fullName || user.email}</p>
            <p className={`text-[10px] font-semibold mt-0.5 truncate ${
              isClient ? "text-purple-400" : "text-blue-400"
            }`}>
              {getUserSubtitle()}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          {menuItems
            .filter(item => item.allowed)
            .map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-250 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="p-4 border-t border-neutral-900 space-y-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/30 border border-neutral-900 text-[11px] text-neutral-500">
            <span>الوقت المحلي: {new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:text-white hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

      </aside>
    </>
  );
}
