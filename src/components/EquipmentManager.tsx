import React, { useState } from "react";
import { 
  Camera, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  UserCheck, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText,
  AlertCircle,
  X,
  Edit3
} from "lucide-react";
import { EquipmentItem, EquipmentCategory, EquipmentStatus, UserProfile, Project } from "../types";

interface EquipmentManagerProps {
  user: UserProfile;
  equipment: EquipmentItem[];
  employees: UserProfile[];
  projects: Project[];
  onAddEquipment: (item: { name: string; category: EquipmentCategory; serial_number: string; notes: string }) => Promise<void>;
  onEditEquipment?: (item: EquipmentItem) => Promise<void>;
  onCheckoutEquipment: (data: {
    equipmentId: string;
    assigned_to_id: string;
    assigned_to_name: string;
    project_id?: string;
    project_title?: string;
    return_date: string;
    notes?: string;
  }) => Promise<void>;
  onReturnEquipment: (equipmentId: string) => Promise<void>;
  onDeleteEquipment: (equipmentId: string) => Promise<void>;
  showToast: (msg: string, type: "success" | "error") => void;
}

const CATEGORIES: EquipmentCategory[] = [
  "كاميرات",
  "عدسات",
  "إضاءة",
  "صوت وميكروفونات",
  "مثبتات وطائرات درون",
  "ملحقات وأخرى"
];

export default function EquipmentManager({
  user,
  equipment,
  employees,
  projects,
  onAddEquipment,
  onEditEquipment,
  onCheckoutEquipment,
  onReturnEquipment,
  onDeleteEquipment,
  showToast
}: EquipmentManagerProps) {
  const isAdmin = user.role === "admin";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [checkoutItem, setCheckoutItem] = useState<EquipmentItem | null>(null);
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // New Equipment Form State
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<EquipmentCategory>("كاميرات");
  const [newSerial, setNewSerial] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Checkout Form State
  const [checkoutEmployeeId, setCheckoutEmployeeId] = useState("");
  const [checkoutProjectId, setCheckoutProjectId] = useState("");
  const [checkoutReturnDate, setCheckoutReturnDate] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Filtered List
  const filteredEquipment = equipment.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Stats calculation
  const totalCount = equipment.length;
  const availableCount = equipment.filter(e => e.status === "متاحة").length;
  const inUseCount = equipment.filter(e => e.status === "قيد الاستخدام").length;
  const maintenanceCount = equipment.filter(e => e.status === "في الصيانة").length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("يرجى إدخال اسم المعدة", "error");
      return;
    }
    setSubmittingAdd(true);
    try {
      await onAddEquipment({
        name: newName.trim(),
        category: newCategory,
        serial_number: newSerial.trim(),
        notes: newNotes.trim()
      });
      setNewName("");
      setNewSerial("");
      setNewNotes("");
      setShowAddModal(false);
      showToast("تم إضافة المعدة بنجاح", "success");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء إضافة المعدة", "error");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutItem) return;
    if (!checkoutEmployeeId) {
      showToast("يرجى اختيار الموظف المستلم", "error");
      return;
    }
    if (!checkoutReturnDate) {
      showToast("يرجى تحديد تاريخ الإرجاع المتوقع", "error");
      return;
    }

    const emp = employees.find(e => e.id === checkoutEmployeeId);
    const proj = projects.find(p => p.id === checkoutProjectId);

    setSubmittingCheckout(true);
    try {
      await onCheckoutEquipment({
        equipmentId: checkoutItem.id,
        assigned_to_id: checkoutEmployeeId,
        assigned_to_name: emp ? (emp.fullName || emp.email.split("@")[0]) : "موظف",
        project_id: checkoutProjectId,
        project_title: proj ? proj.title : "",
        return_date: checkoutReturnDate,
        notes: checkoutNotes.trim()
      });
      setCheckoutItem(null);
      setCheckoutEmployeeId("");
      setCheckoutProjectId("");
      setCheckoutReturnDate("");
      setCheckoutNotes("");
      showToast("تم تسجيل تسليم المعدة بنجاح", "success");
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء تسجيل تسليم المعدة", "error");
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleReturn = async (item: EquipmentItem) => {
    try {
      await onReturnEquipment(item.id);
      showToast(`تم استلام وإعادة المعدة (${item.name}) إلى المخزن بنجاح`, "success");
    } catch (err: any) {
      showToast(err.message || "فشل استلام المعدة", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت تأكد من حذف المعدة (${name}) من السجل؟`)) return;
    try {
      await onDeleteEquipment(id);
      showToast("تم حذف المعدة بنجاح", "success");
    } catch (err: any) {
      showToast(err.message || "فشل حذف المعدة", "error");
    }
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case "متاحة":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>جاهزة ومتاحة</span>
          </span>
        );
      case "قيد الاستخدام":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-800/40">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد الاستخدام</span>
          </span>
        );
      case "في الصيانة":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-800/40">
            <Wrench className="w-3.5 h-3.5" />
            <span>في الصيانة</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900/60 p-6 rounded-2xl border border-neutral-850">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">إدارة معدات وأدوات التصوير</h2>
              <p className="text-xs text-neutral-400 mt-1">حصر وتتبع الكاميرات، العدسات، الإضاءة وأجهزة الصوت وسجلات التسليم للجلسات</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition shadow-lg shadow-blue-950/40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة معدة جديدة</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-neutral-900/50 border border-neutral-850 p-4 rounded-xl">
          <p className="text-xs font-medium text-neutral-400">إجمالي المعدات المسجلة</p>
          <p className="text-2xl font-extrabold text-white mt-2">{totalCount}</p>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl">
          <p className="text-xs font-medium text-emerald-400">المعدات المتاحة بالمخزن</p>
          <p className="text-2xl font-extrabold text-emerald-300 mt-2">{availableCount}</p>
        </div>
        <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl">
          <p className="text-xs font-medium text-amber-400">محجوزة / قيد الاستخدام</p>
          <p className="text-2xl font-extrabold text-amber-300 mt-2">{inUseCount}</p>
        </div>
        <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl">
          <p className="text-xs font-medium text-rose-400">معدات في الصيانة</p>
          <p className="text-2xl font-extrabold text-rose-300 mt-2">{maintenanceCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-900">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            جميع التصنيفات
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-900 border border-neutral-850 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="all">كل الحالات</option>
            <option value="متاحة">متاحة</option>
            <option value="قيد الاستخدام">قيد الاستخدام</option>
            <option value="في الصيانة">في الصيانة</option>
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالمعدة أو السيريال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-850 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Equipment Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-neutral-950 border border-neutral-900 rounded-2xl">
            <Camera className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-400">لا توجد معدات طابقت محددات البحث</p>
          </div>
        ) : (
          filteredEquipment.map(item => (
            <div 
              key={item.id}
              className="bg-neutral-900/50 border border-neutral-850 hover:border-neutral-750 p-5 rounded-2xl flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-900/40">
                    {item.category}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {item.name}
                </h3>

                <div className="space-y-1.5 text-xs text-neutral-400 mb-4">
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500">
                    <Tag className="w-3.5 h-3.5" />
                    <span>الرقم التسلسلي: {item.serial_number}</span>
                  </p>
                  {item.notes && (
                    <p className="text-neutral-400 text-xs line-clamp-2">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Checkout Status Info */}
                {item.status === "قيد الاستخدام" && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-850 space-y-1.5 text-xs mb-4">
                    <div className="flex items-center justify-between text-neutral-300 font-semibold">
                      <span className="flex items-center gap-1 text-amber-400">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>المستلم:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{item.assigned_to_name}</span>
                        {item.assigned_to_id && (
                          <button
                            type="button"
                            onClick={() => {
                              const emp = employees.find(e => e.id === item.assigned_to_id);
                              const phone = emp?.phone || "";
                              const msg = `تذكير عاجل - معدات الإنتاج 🎥
أهلاً ${item.assigned_to_name}،
نود تذكيرك بموعد إرجاع المعدة لمخزن وكالة *LUMÉRÉ*:
📷 *المعدة:* ${item.name}
📅 *تاريخ الإرجاع المتوقع:* ${item.return_date || "قريباً"}
يرجى تسليمها في الموعد المحدد. شاكرين تعاونك! 🙏🏼`;
                              
                              if (phone) {
                                let clean = phone.replace(/[^0-9]/g, "");
                                if (clean.startsWith("01") && clean.length === 11) clean = "20" + clean.substring(1);
                                window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                                showToast("تم فتح WhatsApp لإرسال التذكير للمستلم 💬", "success");
                              } else {
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                                showToast("تم تجهيز رسالة التذكير للإرسال 💬", "success");
                              }
                            }}
                            className="text-[10px] bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-900/40 px-2 py-0.5 rounded font-bold transition cursor-pointer"
                            title="إرسال تذكير إرجاع بالواتساب للمستلم"
                          >
                            تذكير 💬
                          </button>
                        )}
                      </div>
                    </div>
                    {item.project_title && (
                      <p className="text-[11px] text-neutral-400 truncate">
                        المشروع: {item.project_title}
                      </p>
                    )}
                    {item.return_date && (
                      <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>تاريخ الإرجاع المتوقع: {item.return_date}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-850 flex items-center justify-between gap-2">
                {item.status === "متاحة" ? (
                  isAdmin && (
                    <button
                      onClick={() => setCheckoutItem(item)}
                      className="w-full flex items-center justify-center gap-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 py-2 rounded-xl text-xs font-bold transition"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>تسليم لمستلم/جلسة</span>
                    </button>
                  )
                ) : item.status === "قيد الاستخدام" ? (
                  isAdmin && (
                    <button
                      onClick={() => handleReturn(item)}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-800/40 py-2 rounded-xl text-xs font-bold transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استلام وإعادة للمخزن</span>
                    </button>
                  )
                ) : (
                  <span className="text-xs text-neutral-500 italic">المعدة قيد الصيانة والتحكم الإداري</span>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditItem(item)}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
                      title="تعديل المعدة"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-xl transition"
                      title="حذف المعدة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: ADD NEW EQUIPMENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500" />
                <span>إضافة معدة تصوير جديدة للمخزن</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">اسم المعدة / الكاميرا *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Sony FX3 / عدسة 85mm f/1.4"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">التصنيف *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as EquipmentCategory)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">الرقم التسلسلي (Serial Number)</label>
                  <input
                    type="text"
                    placeholder="مثال: SN-889412"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">ملاحظات المواصفات والملحقات</label>
                <textarea
                  rows={3}
                  placeholder="الملحقات المرفقة معها (حقيبة، كروت ذاكرة، شواحن)..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  {submittingAdd ? "جاري الإضافة..." : "حفظ وحفظ بالمعرض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECKOUT EQUIPMENT */}
      {checkoutItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <span>تسليم معدة: ({checkoutItem.name})</span>
              </h3>
              <button 
                onClick={() => setCheckoutItem(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">الموظف/المصور المستلم *</label>
                <select
                  required
                  value={checkoutEmployeeId}
                  onChange={(e) => setCheckoutEmployeeId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">اختر الموظف المسؤول...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName || emp.email} ({emp.specialization || "موظف"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">المشروع / الجلسة المرتبطة (اختياري)</label>
                <select
                  value={checkoutProjectId}
                  onChange={(e) => setCheckoutProjectId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">غير مرتبط بمشروع محدد</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>
                      {proj.title} ({proj.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">تاريخ الإرجاع المتوقع للمخزن *</label>
                <input
                  type="date"
                  required
                  value={checkoutReturnDate}
                  onChange={(e) => setCheckoutReturnDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">ملاحظات التسليم وروابط التصوير</label>
                <input
                  type="text"
                  placeholder="ملاحظات حول حالة المعدة عند الاستلام..."
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCheckoutItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckout}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50"
                >
                  {submittingCheckout ? "جاري التسليم..." : "تأكيد وتسليم المعدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT EQUIPMENT */}
      {editItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <span>تعديل بيانات المعدة ({editItem.name})</span>
              </h3>
              <button 
                onClick={() => setEditItem(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!onEditEquipment) return;
                setSubmittingEdit(true);
                try {
                  await onEditEquipment(editItem);
                  setEditItem(null);
                  showToast("تم تحديث بيانات المعدة بنجاح", "success");
                } catch (err: any) {
                  showToast(err.message || "حدث خطأ أثناء تعديل بيانات المعدة", "error");
                } finally {
                  setSubmittingEdit(false);
                }
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">اسم المعدة / الكاميرا *</label>
                <input
                  type="text"
                  required
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">التصنيف *</label>
                  <select
                    value={editItem.category}
                    onChange={(e) => setEditItem({ ...editItem, category: e.target.value as EquipmentCategory })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">الحالة *</label>
                  <select
                    value={editItem.status}
                    onChange={(e) => setEditItem({ ...editItem, status: e.target.value as EquipmentStatus })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="متاحة">متاحة</option>
                    <option value="قيد الاستخدام">قيد الاستخدام</option>
                    <option value="في الصيانة">في الصيانة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">الرقم التسلسلي (Serial Number)</label>
                <input
                  type="text"
                  value={editItem.serial_number || ""}
                  onChange={(e) => setEditItem({ ...editItem, serial_number: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">ملاحظات والتفاصيل</label>
                <textarea
                  rows={3}
                  value={editItem.notes || ""}
                  onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                >
                  {submittingEdit ? "جاري الحفظ..." : "حفظ التغيرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
