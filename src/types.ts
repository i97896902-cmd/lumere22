export type UserRole = "admin" | "employee" | "client";
export type UserStatus = "Pending Approval" | "Approved";
export type Specialization = "مونتير" | "مبرمج" | "مصور" | "جرافيك ديزاينر" | "إنتاج" | "يتدرب" | "مدير" | "مبرمج جوكر" | "عميل";
export type ContractStatus = "ساري" | "منتهي" | "قيد التوقيع";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  specialization?: Specialization;
  contract_url?: string;
  contract_status?: ContractStatus;
  created_at: string;
  fullName?: string;
  phone?: string;
  portfolio?: string;
  bio?: string;
  rating?: number;
  client_id?: string;
  is_local_bypass?: boolean;
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  business_type: string;
  notes?: string;
  contract_url?: string;
  contract_status?: ContractStatus;
  created_at: string;
  has_account?: boolean;
  password?: string;
  account_id?: string;
}

export type ProjectTrack = 
  | "مونتاج وتصحيح ألوان" 
  | "جلسة تصوير" 
  | "بناء موقع / متجر إلكتروني" 
  | "بناء نظام إدارة / سيستم" 
  | "تصميم هوية بصرية وبراندينج" 
  | "حملة إعلانية وتسويقية" 
  | "إدارة صفحات تواصل اجتماعي" 
  | "صناعة محتوى وكتابة سيناريو"
  | "تصوير"
  | "مونتاج"
  | "بناء سيستم / منصة";

export interface Project {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  track_type: ProjectTrack;
  budget: number;
  deadline: string;
  requirements: string;
  drive_url?: string; // S3 or Google Drive link
  created_at: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Review" | "Completed" | "Canceled" | "Rejected" | "Revisions";

export interface Task {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  assigned_to_id: string;
  assigned_to_name: string;
  status: TaskStatus;
  deadline: string;
  delivery_notes?: string; // Notes written by employee upon marking completed
  created_at: string;
}

export type PaymentMethod = "كاش" | "محفظة إلكترونية" | "أنستا باي (InstaPay)";

export interface FinanceTransaction {
  id: string;
  type: "revenue" | "expense";
  amount: number;
  title: string;
  client_name?: string;
  payment_method: PaymentMethod;
  creator_id: string;
  creator_email: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  amount: number;
  month: string;
  payment_date?: string;
  status: "تم الصرف" | "معلق";
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type?: "urgent_deadline" | "delivery" | "info";
  project_id?: string;
  days_left?: number;
}
