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

بعد تطبيق المخطط، يجب إعادة تشغيل اختبار قاعدة البيانات للتأكد من إنشاء جداول `equipment` و`audit_logs` ودالة `pay_payroll`.

إذا ظهر خطأ `Could not find the function public.delete_employee_account`، شغّل ملف [migrations/20260917_employee_account_delete.sql](migrations/20260917_employee_account_delete.sql) في Supabase SQL Editor، ثم أعد تحميل التطبيق.

لحذف العملاء والمهام والمعاملات والرواتب بصلاحية الأدمن، شغّل أيضًا ملف [migrations/20260918_admin_delete_record.sql](migrations/20260918_admin_delete_record.sql) في Supabase SQL Editor، ثم أعد تحميل التطبيق.

إذا ظهرت رسالة صلاحية رغم تسجيل الدخول كأدمن، شغّل [migrations/20260918_fix_admin_authorization.sql](migrations/20260918_fix_admin_authorization.sql). هذا الملف يربط الصلاحية بـ `auth.uid()` و`profiles.id`، ويطبع قيم الدور إلى `admin` بشكل آمن.

> ملاحظة: سياسات RLS الحالية متوافقة مع نظام الدخول المخصص الموجود في التطبيق، لكنها ليست عزلًا أمنيًا كاملًا حسب المستخدم. لا تعتبر قاعدة البيانات جاهزة لبيانات إنتاج حساسة قبل نقل تسجيل الدخول إلى Supabase Auth وتقييد السياسات باستخدام `auth.uid()`.

## Electron

```bash
npm run electron:test
npm run electron:build
```
