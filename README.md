# LUMÉRÉ ERP

نظام إدارة لوكالات الإنتاج الإعلامي والتقني، مبني بواجهة React وVite مع خادم Express وتطبيق Electron.

## المتطلبات

- Node.js 20 أو أحدث
- مشروع Supabase عند استخدام مصدر البيانات السحابي

## التشغيل المحلي

```bash
npm install
npm run dev
```

يفتح الخادم الواجهة على `http://localhost:3000`.

## الفحص والبناء

```bash
npm run lint
npm run build
```

لاختبار جداول Supabase، عرّف المتغيرين التاليين ثم شغّل:

```bash
SUPABASE_URL=https://your-project.supabase.co SUPABASE_ANON_KEY=your-anon-key npm test
```

على PowerShell:

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"
npm test
```

طبّق [schema.sql](schema.sql) على مشروع Supabase قبل تشغيل اختبار الاتصال. يستخدم التطبيق جدول `transactions` للمعاملات المالية.

## Electron

```bash
npm run electron:test
npm run electron:build
```
