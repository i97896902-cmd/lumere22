import React, { ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export default class ErrorBoundary extends (React.Component as new (props: Props) => any) {
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-screen"
          className="min-h-screen bg-[#0b0c10] text-neutral-100 flex items-center justify-center p-6 select-none font-sans"
          dir="rtl"
        >
          <div className="w-full max-w-md bg-[#121318] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-bold text-white">حدث خطأ غير متوقع في واجهة النظام</h1>
              <p className="text-xs text-neutral-400 leading-relaxed">
                تم التقاط الخطأ بنجاح لحماية البيانات ومنع توقف التطبيق أو ظهور شاشة بيضاء.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-neutral-950/90 rounded-xl border border-neutral-900 text-[11px] text-rose-300 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                id="btn-reload-app"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تحميل</span>
              </button>
              <button
                id="btn-reset-app-storage"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الذاكرة والمتابعة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

