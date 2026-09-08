import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2, X, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If running in standalone mode (already installed), show verified status or hide in header
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div id="pwa-status-installed" className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-xl font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>التطبيق مثبت ويعمل كـ PWA مع دعم العمل دون إنترنت</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS (e.g. standard desktop browser that doesn't fire beforeinstallprompt yet),
  // still render in settings, but in header hide if neither is available
  if (!isInstallable && !isIOS && variant === 'header') {
    return null;
  }

  return (
    <>
      {variant === 'header' && (
        <button
          id="btn-pwa-install-header"
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="تثبيت التطبيق على جهازك (PWA)"
          className="relative group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition-all transform active:scale-95 cursor-pointer border border-blue-400/30 animate-pulse hover:animate-none"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تثبيت التطبيق</span>
          <span className="sm:hidden">تثبيت</span>
        </button>
      )}

      {variant === 'banner' && (
        <div id="pwa-install-banner" className="bg-gradient-to-r from-blue-950/80 via-[#121826] to-[#0b0c10] border border-blue-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">تثبيت تطبيق LUMÉRÉ على هاتفك أو حاسوبك</h4>
              <p className="text-xs text-neutral-400">احصل على سرعة فائقة وتنبيهات فورية والعمل بدون إنترنت مثل التطبيقات الأصلية.</p>
            </div>
          </div>
          <button
            id="btn-pwa-install-banner"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer shrink-0 shadow-lg shadow-blue-900/40"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? 'طريقة التثبيت على آيفون' : 'تثبيت التطبيق الآن'}</span>
          </button>
        </div>
      )}

      {variant === 'settings' && (
        <button
          id="btn-pwa-install-settings"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isIOS ? 'إرشادات التثبيت على iOS' : 'تثبيت التطبيق على الجهاز'}</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div id="ios-pwa-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-sm bg-[#121318] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 text-neutral-100">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>تثبيت التطبيق على iPhone / iPad</span>
              </div>
              <button
                id="btn-close-ios-guide"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <div className="flex items-start gap-2.5 p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-white">اضغط على زر المشاركة (Share)</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5 flex items-center gap-1">
                    في أسفل شريط متصفح Safari <Share2 className="w-3.5 h-3.5 inline text-blue-400" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-white">اختر "إضافة إلى الصفحة الرئيسية"</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5 flex items-center gap-1">
                    مرر لأسفل واضغط على <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> Add to Home Screen
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-white">اضغط "إضافة" (Add) في الزاوية</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">سيظهر التطبيق كأيقونة مستقلة على شاشتك مع دعم كامل للإشعارات.</p>
                </div>
              </div>
            </div>

            <button
              id="btn-confirm-ios-guide"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
