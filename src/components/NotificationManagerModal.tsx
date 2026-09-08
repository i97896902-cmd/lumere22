import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, Volume2, VolumeX, Send, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification,
  NotificationPermissionState,
} from '../lib/notifications';

interface NotificationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationManagerModal: React.FC<NotificationManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [testSent, setTestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermissionStatus());
      const savedSound = localStorage.getItem('lumere_sound_enabled');
      setSoundEnabled(savedSound !== 'false');
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('lumere_sound_enabled', String(nextVal));
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const res = await requestNotificationPermission();
      setPermission(res);
      if (res === 'granted') {
        await sendTestNotification();
        setTestSent(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendTest = async () => {
    setTestSent(false);
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  return (
    <div
      id="notification-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-[#121318] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-blue-400 font-bold text-base">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <BellRing className="w-4 h-4" />
            </div>
            <span>إدارة الإشعارات الفورية (Push Notifications)</span>
          </div>
          <button
            id="btn-close-notification-modal"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Status Box */}
        <div className="p-4 rounded-xl border bg-neutral-950/60 flex items-start gap-3">
          {permission === 'granted' && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-emerald-300">الإشعارات مفعلة بالكامل</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-neutral-400">
                  سيرسل لك النظام تنبيهات المهام، المواعيد النهائية، والتعاملات المالية على متصفحك وهاتفك مباشرة.
                </p>
              </div>
            </>
          )}

          {permission === 'default' && (
            <>
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-300">الإشعارات بانتظار التفعيل</h4>
                <p className="text-[11px] text-neutral-400">
                  اضغط على زر التفعيل أدناه لمنح المتصفح صلاحية إرسال الإشعارات عند التحديثات المهمة.
                </p>
              </div>
            </>
          )}

          {permission === 'denied' && (
            <>
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-400">الإشعارات محظورة في إعدادات المتصفح</h4>
                <p className="text-[11px] text-neutral-400">
                  يرجى النقر على أيقونة القفل أو الإعدادات بجانب شريط العنوان (URL) وتعيين الإشعارات على "سماح" (Allow).
                </p>
              </div>
            </>
          )}

          {permission === 'unsupported' && (
            <>
              <BellOff className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-neutral-400">المتصفح لا يدعم واجهة الإشعارات</h4>
                <p className="text-[11px] text-neutral-500">
                  يرجى استخدام متصفح حديث مثل Chrome أو Edge أو Safari 16.4+ لدعم الإشعارات.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button
              id="btn-request-notification-permission"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-lg shadow-blue-900/30 transition cursor-pointer border border-blue-400/30"
            >
              <Bell className="w-4 h-4" />
              <span>{isRequesting ? 'جاري طلب الإذن...' : 'تفعيل الإشعارات الفورية الآن'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-send-test-notification"
              onClick={handleSendTest}
              className="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>إرسال إشعار تجريبي</span>
            </button>

            <button
              id="btn-toggle-notification-sound"
              onClick={handleToggleSound}
              className={`flex items-center justify-center gap-1.5 border font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>الصوت: مفعّل</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
                  <span>الصوت: كتم</span>
                </>
              )}
            </button>
          </div>

          {testSent && (
            <div className="text-center p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] animate-in fade-in">
              تم إرسال الإشعار بنجاح! راجع مركز إشعارات نظامك.
            </div>
          )}
        </div>

        {/* Feature Triggers List */}
        <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-800/80 space-y-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
            الأحداث التي ترسل إشعارات تلقائية:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-300">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>إسناد مهام جديدة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>اقتراب موعد تسليم مشروع</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>سداد فواتير وماليات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>اعتماد عقود رقمية</span>
            </div>
          </div>
        </div>

        <button
          id="btn-dismiss-notification-modal"
          onClick={onClose}
          className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
