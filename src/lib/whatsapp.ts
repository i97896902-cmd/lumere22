/**
 * WhatsApp Messaging & Automation Engine for LUMÉRÉ ERP
 */

export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  
  // If local Egyptian phone starting with 01... convert to 201...
  if (clean.startsWith("01") && clean.length === 11) {
    clean = "20" + clean.substring(1);
  } else if (clean.startsWith("00")) {
    clean = clean.substring(2);
  }
  return clean;
}

export function generateWhatsAppUrl(phone: string, text: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text.trim());
  if (formatted) {
    return `https://wa.me/${formatted}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export function openWhatsAppMessage(phone: string, text: string): boolean {
  if (typeof window === "undefined") return false;
  const url = generateWhatsAppUrl(phone, text);
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

// Pre-designed templates for agency operations

export function getClientAccountWhatsAppTemplate({
  clientName,
  email,
  password,
  portalUrl = window.location.origin
}: {
  clientName: string;
  email: string;
  password: string;
  portalUrl?: string;
}): string {
  return `مرحباً ${clientName} 👋🏼
يسعدنا إبلاغك بتفعيل حسابك الرسمي في بوابة وكالة *LUMÉRÉ* لمتابعة نسبة إنجاز وتسليمات مشاريعك الإبداعية:

🔗 *رابط البوابة:* ${portalUrl}
📧 *البريد الإلكتروني:* ${email}
🔑 *كلمة المرور:* ${password}

يمكنك الآن تسجيل الدخول مباشرة والاطلاع على المهام المسندة ومخرجات العمل. شكراً لثقتك بنا! ✨`;
}

export function getTaskAssignedWhatsAppTemplate({
  taskTitle,
  projectTitle,
  deadline,
  employeeName
}: {
  taskTitle: string;
  projectTitle: string;
  deadline: string;
  employeeName: string;
}): string {
  return `أهلاً ${employeeName} 📋
تم تكليفك بمهمة فنية جديدة في وكالة *LUMÉRÉ*:

📌 *اسم المهمة:* ${taskTitle}
🎬 *المشروع:* ${projectTitle}
⏳ *آخر موعد للتسليم:* ${deadline}

يرجى مراجعة التفاصيل في النظام وتسليم مخرجات العمل فور الجاهزية. بالتوفيق! 🚀`;
}

export function getTaskDeliveredWhatsAppTemplate({
  taskTitle,
  projectTitle,
  deliveryNotes,
  recipientName = "عميلنا العزيز"
}: {
  taskTitle: string;
  projectTitle: string;
  deliveryNotes?: string;
  recipientName?: string;
}): string {
  return `مرحباً ${recipientName} 🎉
تم تسليم وإنجاز مهمة فنية بنجاح في مشروعك لدى وكالة *LUMÉRÉ*:

📌 *المهمة:* ${taskTitle}
🎬 *المشروع:* ${projectTitle}
${deliveryNotes ? `📝 *ملاحظات ومخرجات التسليم:* ${deliveryNotes}` : ""}

يمكنك الاطلاع على العمل الكامل واعتماده عبر النظام مباشرة. يسعدنا دعمكم دائماً! ✨`;
}

export function getEquipmentReminderWhatsAppTemplate({
  equipmentName,
  returnDate,
  assignedToName
}: {
  equipmentName: string;
  returnDate: string;
  assignedToName: string;
}): string {
  return `تذكير عاجل - معدات الإنتاج 🎥
أهلاً ${assignedToName}،
نود تذكيرك بموعد إرجاع المعدة التالية لمخزن وكالة *LUMÉRÉ*:

📷 *المعدة:* ${equipmentName}
📅 *تاريخ الإرجاع المعتمد:* ${returnDate}

يرجى التأكد من تسليمها في الموعد المحدد بحالة ممتازة. شاكرين تعاونك! 🙏🏼`;
}
