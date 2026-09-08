import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Activity, 
  Play, 
  StopCircle, 
  Cpu, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Gauge,
  Info,
  Server,
  Zap,
  Trash2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { apiFetch } from "../lib/api";

interface SystemTelemetry {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  dbStats: {
    users: number;
    clients: number;
    projects: number;
    tasks: number;
    finances: number;
    payroll: number;
    auditLogs: number;
  };
}

interface TestRun {
  id: string;
  timestamp: string;
  route: string;
  totalRequests: number;
  concurrency: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  throughput: number;
  successRate: number;
}

export default function StressTestDashboard() {
  // Telemetry state
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Test settings state
  const [targetRoute, setTargetRoute] = useState("/api/system/stress-test");
  const [totalRequests, setTotalRequests] = useState(100);
  const [concurrency, setConcurrency] = useState(10);

  // Active test execution state
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentLatency, setCurrentLatency] = useState<number | null>(null);
  const [latencies, setLatencies] = useState<{ id: number; latency: number; status: string }[]>([]);
  const [avgLatency, setAvgLatency] = useState(0);
  const [minLatency, setMinLatency] = useState(0);
  const [maxLatency, setMaxLatency] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Historical test runs
  const [history, setHistory] = useState<TestRun[]>(() => {
    const saved = localStorage.getItem("lumere_stress_test_history");
    return saved ? JSON.parse(saved) : [];
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<any>(null);

  // Fetch telemetry on load
  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const data = await apiFetch("/api/system/stress-test");
      setTelemetry(data);
    } catch (error) {
      console.error("Failed to fetch telemetry:", error);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // Auto-refresh telemetry every 10 seconds
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update timer during testing
  useEffect(() => {
    if (isTesting && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedTime(elapsed);
        
        // Calculate throughput (requests per second)
        const completed = successCount + errorCount;
        if (elapsed > 0) {
          setThroughput(Math.round((completed / elapsed) * 10) / 10);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTesting, startTime, successCount, errorCount]);

  // Run the stress test
  const handleStartTest = async () => {
    if (isTesting) return;

    setIsTesting(true);
    setProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
    setCurrentLatency(null);
    setLatencies([]);
    setAvgLatency(0);
    setMinLatency(0);
    setMaxLatency(0);
    setThroughput(0);
    setElapsedTime(0);
    
    const sTime = Date.now();
    setStartTime(sTime);

    abortControllerRef.current = new AbortController();
    let token = "";
    const userJson = localStorage.getItem("lumere_user");
    if (userJson) {
      try {
        const parsed = JSON.parse(userJson);
        token = parsed.id || "";
      } catch (e) {
        console.error("Failed to parse user token", e);
      }
    }

    const requestList: (() => Promise<void>)[] = [];
    
    // Create all fetch tasks
    for (let i = 0; i < totalRequests; i++) {
      requestList.push(async () => {
        const reqStart = Date.now();
        try {
          const headers: HeadersInit = {
            "Content-Type": "application/json"
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const resolvedUrl = targetRoute.startsWith("/") 
            ? `${window.location.origin}${targetRoute}` 
            : targetRoute;

          const response = await fetch(resolvedUrl, {
            method: "GET",
            headers,
            signal: abortControllerRef.current?.signal
          });

          const reqEnd = Date.now();
          const latency = reqEnd - reqStart;

          if (response.ok) {
            setSuccessCount(prev => prev + 1);
            setLatencies(prev => {
              const updated = [...prev, { id: i + 1, latency, status: "success" }];
              updateAggregates(updated);
              return updated;
            });
          } else {
            setErrorCount(prev => prev + 1);
            setLatencies(prev => {
              const updated = [...prev, { id: i + 1, latency, status: "error" }];
              updateAggregates(updated);
              return updated;
            });
          }
          setCurrentLatency(latency);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            const reqEnd = Date.now();
            const latency = reqEnd - reqStart;
            setErrorCount(prev => prev + 1);
            setLatencies(prev => {
              const updated = [...prev, { id: i + 1, latency, status: "error" }];
              updateAggregates(updated);
              return updated;
            });
            setCurrentLatency(latency);
          }
        } finally {
          setProgress(prev => {
            const nextProgress = prev + (100 / totalRequests);
            return Math.min(nextProgress, 100);
          });
        }
      });
    }

    const updateAggregates = (currentList: { latency: number; status: string }[]) => {
      const successful = currentList.filter(l => l.status === "success");
      if (successful.length === 0) return;

      const values = successful.map(l => l.latency);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

      setMinLatency(min);
      setMaxLatency(max);
      setAvgLatency(avg);
    };

    // Execute with controlled concurrency (batches)
    const activePromises: Promise<void>[] = [];
    const pool = [...requestList];

    // Worker function
    const worker = async () => {
      while (pool.length > 0 && !abortControllerRef.current?.signal.aborted) {
        const task = pool.shift();
        if (task) {
          await task();
        }
      }
    };

    // Spawn workers matching the concurrency limit
    const spawnCount = Math.min(concurrency, pool.length);
    const workers: Promise<void>[] = [];
    for (let w = 0; w < spawnCount; w++) {
      workers.push(worker());
    }

    // Wait for all workers to finish
    await Promise.all(workers);

    const testEndTime = Date.now();
    const finalElapsed = (testEndTime - sTime) / 1000;
    const finalCompleted = successCount + errorCount;
    const finalThroughput = finalElapsed > 0 ? Math.round((finalCompleted / finalElapsed) * 10) / 10 : 0;

    setIsTesting(false);
    clearInterval(intervalRef.current);

    // Save history if not fully aborted
    if (finalCompleted > 0) {
      const finalSuccessRate = Math.round((successCount / finalCompleted) * 100) || 0;
      
      const newRun: TestRun = {
        id: "run_" + Date.now(),
        timestamp: new Date().toLocaleString("ar-EG"),
        route: targetRoute,
        totalRequests: finalCompleted,
        concurrency,
        avgLatency: avgLatency || 0,
        minLatency: minLatency || 0,
        maxLatency: maxLatency || 0,
        throughput: finalThroughput,
        successRate: finalSuccessRate
      };

      setHistory(prev => {
        const updated = [newRun, ...prev].slice(0, 10); // Keep last 10
        localStorage.setItem("lumere_stress_test_history", JSON.stringify(updated));
        return updated;
      });
    }

    // Refresh telemetry to show updated resources
    fetchTelemetry();
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTesting(false);
    clearInterval(intervalRef.current);
    fetchTelemetry();
  };

  const handleClearHistory = () => {
    localStorage.removeItem("lumere_stress_test_history");
    setHistory([]);
  };

  // Humanize uptime
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}ساعة ${mins}دقيقة ${secs}ثانية`;
  };

  return (
    <div className="space-y-6" id="stress-test-dashboard">
      
      {/* Introduction Banner */}
      <div className="bg-[#0b0c10] border border-neutral-900 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              اختبار الضغط ومراقبة الأداء لـ LUMÉRÉ
            </h2>
            <p className="text-xs text-neutral-400">
              قم بإرسال مئات الطلبات المتزامنة لمحاكاة هجوم ضغط أو ازدحام مستخدمين وقياس استجابة الخادم والذاكرة ومعدلات الخطأ والنجاح.
            </p>
          </div>
          <button 
            onClick={fetchTelemetry}
            disabled={loadingTelemetry}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTelemetry ? "animate-spin" : ""}`} />
            <span>تحديث البيانات الحية</span>
          </button>
        </div>
      </div>

      {/* Grid: Server Stats and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Telemetry Panel */}
        <div className="lg:col-span-2 bg-[#0b0c10] border border-neutral-900 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Server className="w-4 h-4 text-emerald-500" />
            بيانات الخادم والمصادر الحية (Node.js Container)
          </h3>

          {telemetry ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* RAM Usage Card */}
              <div className="bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">استهلاك الذاكرة العشوائية RAM</span>
                  <Cpu className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-white font-mono">{telemetry.memory.heapUsed}</span>
                    <span className="text-[10px] text-neutral-500 font-semibold">ميجابايت</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        telemetry.memory.heapUsed > 100 ? "bg-amber-500" : "bg-blue-600"
                      }`} 
                      style={{ width: `${Math.min((telemetry.memory.heapUsed / telemetry.memory.heapTotal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>المخصص: {telemetry.memory.heapTotal} ميجابايت</span>
                  <span>الفيزيائي RSS: {telemetry.memory.rss} ميجابايت</span>
                </div>
              </div>

              {/* Server Uptime Card */}
              <div className="bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">زمن تشغيل الحاوية Uptime</span>
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-neutral-200 mt-2">
                    {formatUptime(telemetry.uptime)}
                  </div>
                </div>
                <div className="text-[10px] text-neutral-500">
                  الخادم يعمل بحالة ممتازة ومستقرة
                </div>
              </div>

              {/* DB Sizing Card */}
              <div className="bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">حجم سجلات وقاعدة البيانات</span>
                  <Database className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {telemetry.dbStats.users + 
                       telemetry.dbStats.clients + 
                       telemetry.dbStats.projects + 
                       telemetry.dbStats.tasks + 
                       telemetry.dbStats.finances + 
                       telemetry.dbStats.payroll + 
                       telemetry.dbStats.auditLogs}
                    </span>
                    <span className="text-[10px] text-neutral-500">سجل إجمالي</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[10px] text-neutral-500">
                  <span>المشاريع: {telemetry.dbStats.projects}</span>
                  <span>المهام: {telemetry.dbStats.tasks}</span>
                  <span>العملاء: {telemetry.dbStats.clients}</span>
                  <span>المالية: {telemetry.dbStats.finances}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-28 flex items-center justify-center">
              <div className="flex items-center gap-2.5 text-neutral-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span>جاري تحميل بيانات Telemetry للخادم...</span>
              </div>
            </div>
          )}

          {/* Subtext info */}
          <div className="bg-neutral-950/30 p-3 border border-neutral-900 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-neutral-400">
              يقوم الخادم بتخزين البيانات محلياً في ملف <code className="text-blue-400 font-mono text-[10px]">db.json</code>. تظهر هذه لوحة العمليات النشطة والذاكرة المستخدمة من قبل عملية Node.js.
            </p>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-[#0b0c10] border border-neutral-900 rounded-xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            إعدادات اختبار الضغط
          </h3>

          <div className="space-y-4">
            
            {/* Target Route */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">الواجهة البرمجية المستهدفة (Target Endpoint)</label>
              <select 
                value={targetRoute}
                onChange={(e) => setTargetRoute(e.target.value)}
                disabled={isTesting}
                className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-blue-600 transition"
              >
                <option value="/api/system/stress-test">/api/system/stress-test (اختبار مخصص + ضغط معالج)</option>
                <option value="/api/projects">/api/projects (قراءة المشاريع - ضغط قاعدة بيانات)</option>
                <option value="/api/tasks">/api/tasks (قراءة وفرز المهام - ضغط معالجة وقاعدة بيانات)</option>
              </select>
            </div>

            {/* Total Requests */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">إجمالي الطلبات (Total Requests)</span>
                <span className="text-white font-mono font-bold">{totalRequests} طلب</span>
              </div>
              <input 
                type="range"
                min="10"
                max="500"
                step="10"
                value={totalRequests}
                onChange={(e) => setTotalRequests(Number(e.target.value))}
                disabled={isTesting}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>10 طلبات</span>
                <span>500 طلب (أقصى فحص متزامن آمن)</span>
              </div>
            </div>

            {/* Concurrency Batch */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">الطلبات المتزامنة في نفس اللحظة (Concurrency)</span>
                <span className="text-blue-400 font-mono font-bold">{concurrency} طلب متزامن</span>
              </div>
              <input 
                type="range"
                min="1"
                max="50"
                step="1"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={isTesting}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>1 طلب (تسلسلي)</span>
                <span>50 طلب متزامن</span>
              </div>
            </div>

            {/* Execution Buttons */}
            <div className="pt-2">
              {!isTesting ? (
                <button 
                  onClick={handleStartTest}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-blue-950/50"
                >
                  <Play className="w-4 h-4" />
                  بدء اختبار الضغط والتحمل للوكالة
                </button>
              ) : (
                <button 
                  onClick={handleAbort}
                  className="w-full py-3 rounded-lg bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white flex items-center justify-center gap-2 transition duration-200 shadow-lg shadow-rose-950/50"
                >
                  <StopCircle className="w-4 h-4 animate-pulse" />
                  إلغاء وإيقاف الفحص فوراً
                </button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Progress & Live Results View */}
      {(isTesting || latencies.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0b0c10] border border-neutral-900 rounded-xl p-5 space-y-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isTesting ? "bg-amber-500 animate-ping" : "bg-emerald-500"}`} />
                {isTesting ? "جاري تشغيل الفحص حالياً..." : "تم إكمال اختبار الضغط بنجاح"}
              </h3>
              <p className="text-xs text-neutral-500">
                الواجهة المستهدفة: <code className="text-neutral-300 font-mono">{targetRoute}</code> (بحد متزامن قدره {concurrency})
              </p>
            </div>
            <div className="text-xs text-neutral-400 font-mono bg-neutral-950 px-3 py-1.5 border border-neutral-900 rounded-lg">
              الوقت المنقضي: <span className="text-blue-400 font-bold">{elapsedTime.toFixed(1)} ثانية</span>
            </div>
          </div>

          {/* Real-time KPI Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Avg Latency */}
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl text-center space-y-1">
              <p className="text-[10px] text-neutral-400">متوسط سرعة الاستجابة</p>
              <p className="text-2xl font-black text-blue-500 font-mono">
                {avgLatency ? `${avgLatency}ms` : "-"}
              </p>
              <p className="text-[9px] text-neutral-600">Avg Response Time</p>
            </div>

            {/* Throughput */}
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl text-center space-y-1">
              <p className="text-[10px] text-neutral-400">معدل المعالجة الفعلي</p>
              <p className="text-2xl font-black text-amber-500 font-mono">
                {throughput ? `${throughput} rps` : "-"}
              </p>
              <p className="text-[9px] text-neutral-600">Requests per Second</p>
            </div>

            {/* Min / Max Latencies */}
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl text-center space-y-1">
              <p className="text-[10px] text-neutral-400">نطاق الاستجابة (أسرع / أبطأ)</p>
              <p className="text-sm font-bold text-white font-mono mt-2">
                {minLatency}ms / {maxLatency}ms
              </p>
              <p className="text-[9px] text-neutral-600">Min / Max Latency</p>
            </div>

            {/* Success Count */}
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl text-center space-y-1">
              <p className="text-[10px] text-neutral-400">الطلبات الناجحة (2xx)</p>
              <p className="text-2xl font-black text-emerald-500 font-mono">
                {successCount}
              </p>
              <p className="text-[9px] text-neutral-600">Success Rate: {successCount + errorCount > 0 ? Math.round((successCount / (successCount + errorCount)) * 100) : 0}%</p>
            </div>

            {/* Error Count */}
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl text-center space-y-1 col-span-2 md:col-span-1">
              <p className="text-[10px] text-neutral-400">الطلبات الفاشلة / أخطاء</p>
              <p className={`text-2xl font-black font-mono ${errorCount > 0 ? "text-rose-500" : "text-neutral-500"}`}>
                {errorCount}
              </p>
              <p className="text-[9px] text-neutral-600">Failed / Connection Timeout</p>
            </div>

          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>نسبة تقدم الاختبار</span>
              <span className="font-mono font-bold text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-3 border border-neutral-900 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-150" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>الطلبات المكتملة: {successCount + errorCount}</span>
              <span>المتبقي: {totalRequests - (successCount + errorCount)}</span>
            </div>
          </div>

          {/* Real-time Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            
            {/* Latency Area Chart */}
            <div className="bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                منحنى سرعة استجابة الطلبات (بالمللي ثانية)
              </h4>
              <div className="h-60 w-full text-xs">
                {latencies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={latencies}
                      margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1d22" />
                      <XAxis dataKey="id" stroke="#525252" />
                      <YAxis stroke="#525252" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1e2025", color: "#e5e5e5" }}
                        labelFormatter={(label) => `الطلب رقم: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="latency" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#latencyGrad)" 
                        name="زمن الاستجابة (ms)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-600">
                    لا تتوفر أي بيانات حتى الآن
                  </div>
                )}
              </div>
            </div>

            {/* Error vs Success Distribution Chart */}
            <div className="bg-neutral-950/60 p-4 border border-neutral-900 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                توزيع حالة معالجة استجابات الطلبات
              </h4>
              <div className="h-60 w-full text-xs flex flex-col justify-between">
                {latencies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={[
                        { name: "نجاح (200 OK)", value: successCount, color: "#10b981" },
                        { name: "فشل / خطأ (Error)", value: errorCount, color: "#f43f5e" }
                      ]}
                      margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1d22" />
                      <XAxis dataKey="name" stroke="#525252" />
                      <YAxis stroke="#525252" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1e2025", color: "#e5e5e5" }}
                      />
                      <Bar dataKey="value" name="عدد الطلبات" radius={[6, 6, 0, 0]}>
                        <Cell fill="#10b981" />
                        <Cell fill="#f43f5e" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-600">
                    لا تتوفر أي بيانات حتى الآن
                  </div>
                )}
                <div className="flex justify-center gap-6 text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> ناجح: {successCount}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> فاشل: {errorCount}</span>
                </div>
              </div>
            </div>

          </div>

        </motion.div>
      )}

      {/* Historical Logs List */}
      <div className="bg-[#0b0c10] border border-neutral-900 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            سجل الفحوصات السابقة والمقارنة
          </h3>
          {history.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-950/20 border border-rose-900/40 px-2 py-1 rounded transition"
            >
              <Trash2 className="w-3 h-3" />
              مسح السجل
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-900 text-neutral-400">
                  <th className="pb-3 pt-1 font-medium">التاريخ والوقت</th>
                  <th className="pb-3 pt-1 font-medium">الواجهة</th>
                  <th className="pb-3 pt-1 font-medium">إجمالي الطلبات</th>
                  <th className="pb-3 pt-1 font-medium">التزامن</th>
                  <th className="pb-3 pt-1 font-medium text-blue-400">متوسط الاستجابة</th>
                  <th className="pb-3 pt-1 font-medium text-amber-400">الإنتاجية rps</th>
                  <th className="pb-3 pt-1 font-medium">نسبة النجاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/50">
                {history.map((run) => (
                  <tr key={run.id} className="text-neutral-300 hover:bg-neutral-950/40 transition">
                    <td className="py-3 font-mono">{run.timestamp}</td>
                    <td className="py-3 font-mono text-neutral-400">{run.route}</td>
                    <td className="py-3">{run.totalRequests} طلب</td>
                    <td className="py-3">{run.concurrency} متزامن</td>
                    <td className="py-3 font-mono font-bold text-blue-400">{run.avgLatency}ms</td>
                    <td className="py-3 font-mono font-bold text-amber-400">{run.throughput} req/s</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        run.successRate >= 95 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" 
                          : run.successRate >= 80 
                            ? "bg-amber-950/40 text-amber-400 border border-amber-900/40" 
                            : "bg-rose-950/40 text-rose-400 border border-rose-900/40"
                      }`}>
                        {run.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-500 text-xs">
            لم يتم تنفيذ أي فحوصات ضغط حتى الآن. قم بإعداد الاختبار بالأعلى لبدء القياس والمقارنة.
          </div>
        )}
      </div>

    </div>
  );
}
