import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { 
  UserProfile, 
  ClientProfile, 
  Project, 
  Task, 
  FinanceTransaction, 
  PayrollRecord, 
  AppNotification 
} from "./src/types";

const app = express();
const PORT = 3000;
function getSafeDbFilePath(): string {
  // If running in packaged desktop app or APPDATA is present, use safe AppData directory
  if (process.env.APPDATA) {
    const dir = path.join(process.env.APPDATA, "lumere-erp");
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return path.join(dir, "db.json");
    } catch {
      // Fallback
    }
  }
  return path.join(process.cwd(), "db.json");
}

const DB_FILE = getSafeDbFilePath();

// Define custom request interfaces or helpers since we use simple bearer tokens
app.use(express.json());

// Initialize Database
interface DBStructure {
  users: Array<UserProfile & { 
    password?: string; 
    resetPasswordToken?: string; 
    resetPasswordExpires?: number;
  }>;
  clients: ClientProfile[];
  projects: Project[];
  tasks: Task[];
  finances: FinanceTransaction[];
  payroll: PayrollRecord[];
  notifications: AppNotification[];
  auditLogs: Array<{
    id: string;
    action: string;
    userId: string;
    userEmail: string;
    timestamp: string;
    details: string;
  }>;
}

function loadDB(): DBStructure {
  if (!fs.existsSync(DB_FILE)) {
    // Check if a seed db.json exists in process.cwd() or adjacent directory to seed from
    const localSeed = path.join(process.cwd(), "db.json");
    if (fs.existsSync(localSeed) && localSeed !== DB_FILE) {
      try {
        const seedData = fs.readFileSync(localSeed, "utf-8");
        const parsed = JSON.parse(seedData);
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
        return parsed;
      } catch {
        // Fallback to fresh initialDB
      }
    }

    const initialDB: DBStructure = {
      users: [
        {
          id: "admin-user-id",
          email: "yousef555554321@gmail.com",
          password: "146008",
          role: "admin",
          status: "Approved",
          created_at: new Date().toISOString()
        },
        {
          id: "ghareb-user-id",
          email: "ghareb@lumere.com",
          fullName: "غريب",
          password: "ghareb123",
          role: "employee",
          status: "Approved",
          specialization: "مونتير",
          phone: "01000000001",
          bio: "محرر ومونتير فيديو محترف - وكالة LUMÉRÉ",
          created_at: new Date().toISOString()
        },
        {
          id: "mohamed-user-id",
          email: "mohamed@lumere.gmail.com",
          fullName: "محمد",
          password: "mohamed2233",
          role: "employee",
          status: "Approved",
          specialization: "مصور",
          phone: "01032659109",
          bio: "مصور محترف - وكالة LUMÉRÉ",
          created_at: new Date().toISOString()
        }
      ],
      clients: [],
      projects: [],
      tasks: [],
      finances: [],
      payroll: [],
      notifications: [],
      auditLogs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    let updated = false;

    // Ensure admin user is always present
    const hasAdmin = parsed.users.some((u: any) => u.email === "yousef555554321@gmail.com");
    if (!hasAdmin) {
      parsed.users.push({
        id: "admin-user-id",
        email: "yousef555554321@gmail.com",
        password: "146008",
        role: "admin",
        status: "Approved",
        created_at: new Date().toISOString()
      });
      updated = true;
    }

    // Ensure Ghareb montage user is always present
    const hasGhareb = parsed.users.some((u: any) => ["ghareb@lumere.com", "ghareb.lumere.com"].includes(u.email?.toLowerCase()));
    if (!hasGhareb) {
      parsed.users.push({
        id: "ghareb-user-id",
        email: "ghareb@lumere.com",
        fullName: "غريب",
        password: "ghareb123",
        role: "employee",
        status: "Approved",
        specialization: "مونتير",
        phone: "01000000001",
        bio: "محرر ومونتير فيديو محترف - وكالة LUMÉRÉ",
        created_at: new Date().toISOString()
      });
      updated = true;
    }

    // Ensure Mohamed photographer user is always present
    const hasMohamed = parsed.users.some((u: any) => ["mohamed@lumere.gmail.com", "mohamed.lumere.gmail.com"].includes(u.email?.toLowerCase()));
    if (!hasMohamed) {
      parsed.users.push({
        id: "mohamed-user-id",
        email: "mohamed@lumere.gmail.com",
        fullName: "محمد",
        password: "mohamed2233",
        role: "employee",
        status: "Approved",
        specialization: "مصور",
        phone: "01032659109",
        bio: "مصور محترف - وكالة LUMÉRÉ",
        created_at: new Date().toISOString()
      });
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    return {
      users: [
        {
          id: "admin-user-id",
          email: "yousef555554321@gmail.com",
          password: "146008",
          role: "admin",
          status: "Approved",
          created_at: new Date().toISOString()
        },
        {
          id: "mohamed-user-id",
          email: "mohamed@lumere.gmail.com",
          fullName: "محمد",
          password: "mohamed2233",
          role: "employee",
          status: "Approved",
          specialization: "مصور",
          phone: "01032659109",
          bio: "مصور محترف - وكالة LUMÉRÉ",
          created_at: new Date().toISOString()
        }
      ],
      clients: [],
      projects: [],
      tasks: [],
      finances: [],
      payroll: [],
      notifications: [],
      auditLogs: []
    };
  }
}

function saveDB(db: DBStructure) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Log actions with exact audit logging as requested
function logAudit(db: DBStructure, userId: string, userEmail: string, action: string, details: string) {
  if (!db.auditLogs) {
    db.auditLogs = [];
  }
  db.auditLogs.unshift({
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    action,
    userId,
    userEmail,
    timestamp: new Date().toISOString(),
    details
  });
}

// Check authorization middleware
const authUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح لك بالدخول" });
  }
  const userId = authHeader.split(" ")[1];
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "المستخدم غير موجود" });
  }
  (req as any).user = user;
  next();
};

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user as UserProfile;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "هذه الصلاحية للمدير فقط" });
  }
  next();
};

// --- AUTHENTICATION API ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
  }
  
  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  const emailWithAt = !normalizedEmail.includes("@") && normalizedEmail.includes(".")
    ? normalizedEmail.substring(0, normalizedEmail.indexOf(".")) + "@" + normalizedEmail.substring(normalizedEmail.indexOf(".") + 1)
    : normalizedEmail;
  
  // Find user by email and password
  const user = db.users.find(u => {
    const uEmail = u.email.trim().toLowerCase();
    return (uEmail === normalizedEmail || uEmail === emailWithAt) && u.password === password;
  });
  if (!user) {
    return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  }

  if (user.status === "Pending Approval") {
    return res.status(403).json({ error: "حسابك قيد المراجعة والقبول من قِبل الإدارة. يرجى الانتظار" });
  }

  // Return user info
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post("/api/auth/signup", (req, res) => {
  const { email, password, fullName, phone, specialization, portfolio, bio } = req.body;
  if (!email || !password || !fullName || !phone || !specialization) {
    return res.status(400).json({ error: "يرجى تعبئة جميع الحقول المطلوبة بالكامل" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
  }

  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  
  const exists = db.users.some(u => u.email.trim().toLowerCase() === normalizedEmail);
  if (exists) {
    return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل في النظام" });
  }

  const newUser: UserProfile & { password?: string } = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    email: normalizedEmail,
    password: password,
    role: "employee",
    status: "Pending Approval",
    fullName,
    phone,
    specialization,
    portfolio,
    bio,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);
  res.json({ message: "تم التسجيل بنجاح وحسابك بانتظار موافقة الإدارة" });
});

// --- USER MANAGEMENT (ADMIN ONLY) ---
app.get("/api/users/pending", authUser, adminOnly, (req, res) => {
  const db = loadDB();
  const pending = db.users.filter(u => u.status === "Pending Approval");
  res.json(pending);
});

app.post("/api/users/approve", authUser, adminOnly, (req, res) => {
  const { userId, specialization } = req.body;
  if (!userId || !specialization) {
    return res.status(400).json({ error: "بيانات الموافقة غير مكتملة" });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "الموظف غير موجود" });
  }

  db.users[userIndex].status = "Approved";
  db.users[userIndex].specialization = specialization;
  db.users[userIndex].contract_status = "قيد التوقيع"; // Default contract status
  
  // Log action
  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "APPROVE_EMPLOYEE", `تم قبول الموظف ${db.users[userIndex].email} بتخصص ${specialization}`);

  // Create welcome notification
  db.notifications.unshift({
    id: "not_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    user_id: userId,
    title: "مرحباً بك في LUMÉRÉ 🎉",
    message: `تم تفعيل حسابك بنجاح وتعيين تخصصك كـ (${specialization}). يمكنك الآن استخدام النظام بشكل كامل.`,
    is_read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  res.json({ message: "تم تفعيل حساب الموظف وتعيين التخصص بنجاح" });
});

app.post("/api/users/reject", authUser, adminOnly, (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "معرف الموظف مطلوب" });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "الموظف غير موجود" });
  }

  const userEmail = db.users[userIndex].email;
  db.users.splice(userIndex, 1);

  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "REJECT_EMPLOYEE", `تم رفض وحذف طلب انضمام الموظف ${userEmail}`);

  saveDB(db);
  res.json({ message: "تم رفض وحذف الطلب بنجاح" });
});

app.get("/api/users", authUser, (req, res) => {
  const db = loadDB();
  const approved = db.users
    .filter(u => u.status === "Approved")
    .map(({ password: _, ...u }) => u);
  res.json(approved);
});

app.post("/api/users/update-contract", authUser, adminOnly, (req, res) => {
  const { employeeId, contractUrl, contractStatus } = req.body;
  if (!employeeId || !contractStatus) {
    return res.status(400).json({ error: "البيانات المطلوبة لتحديث العقد ناقصة" });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === employeeId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "الموظف غير موجود" });
  }

  db.users[userIndex].contract_url = contractUrl || "";
  db.users[userIndex].contract_status = contractStatus;

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "UPDATE_EMPLOYEE_CONTRACT", 
    `تم تحديث عقد الموظف ${db.users[userIndex].email} للحالة: ${contractStatus}`
  );

  saveDB(db);
  res.json({ message: "تم تحديث بيانات عقد الموظف بنجاح" });
});

app.post("/api/users/rate", authUser, adminOnly, (req, res) => {
  const { employeeId, rating } = req.body;
  if (!employeeId || rating === undefined) {
    return res.status(400).json({ error: "البيانات المطلوبة لتقييم الموظف ناقصة" });
  }

  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "يجب أن يكون التقييم بين 1 و 5 نجوم" });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === employeeId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "الموظف غير موجود" });
  }

  db.users[userIndex].rating = numRating;

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "RATE_EMPLOYEE", 
    `تم تقييم الموظف ${db.users[userIndex].email} بـ ${numRating} نجوم`
  );

  saveDB(db);
  res.json({ message: "تم تسجيل تقييم الموظف بنجاح", rating: numRating });
});

// --- CLIENT MANAGEMENT (ADMIN ONLY) ---
app.get("/api/clients", authUser, adminOnly, (req, res) => {
  const db = loadDB();
  res.json(db.clients);
});

app.post("/api/clients", authUser, adminOnly, (req, res) => {
  const { name, phone, email, business_type, notes, contract_url, contract_status } = req.body;
  if (!name || !phone || !email || !business_type) {
    return res.status(400).json({ error: "يرجى تعبئة جميع الحقول الإجبارية للعميل" });
  }

  const db = loadDB();
  const newClient: ClientProfile = {
    id: "clt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    name,
    phone,
    email,
    business_type: business_type || "",
    notes: notes || "",
    contract_url: contract_url || "",
    contract_status: contract_status || "قيد التوقيع",
    created_at: new Date().toISOString()
  };

  db.clients.push(newClient);

  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "CREATE_CLIENT", `تم إنشاء عميل جديد: ${name} (${email})`);

  saveDB(db);
  res.json(newClient);
});

app.post("/api/clients/update-contract", authUser, adminOnly, (req, res) => {
  const { clientId, contractUrl, contractStatus } = req.body;
  if (!clientId || !contractStatus) {
    return res.status(400).json({ error: "بيانات العقد المطلوبة ناقصة" });
  }

  const db = loadDB();
  const clientIndex = db.clients.findIndex(c => c.id === clientId);
  if (clientIndex === -1) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  db.clients[clientIndex].contract_url = contractUrl || "";
  db.clients[clientIndex].contract_status = contractStatus;

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "UPDATE_CLIENT_CONTRACT", 
    `تم تحديث عقد العميل ${db.clients[clientIndex].name} للحالة: ${contractStatus}`
  );

  saveDB(db);
  res.json({ message: "تم تحديث عقد العميل بنجاح" });
});

app.delete("/api/clients/:id", authUser, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const clientIndex = db.clients.findIndex(c => c.id === id);
  if (clientIndex === -1) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  const clientName = db.clients[clientIndex].name;
  db.clients.splice(clientIndex, 1);

  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "DELETE_CLIENT", `تم حذف العميل ${clientName}`);

  saveDB(db);
  res.json({ message: "تم حذف العميل بنجاح" });
});

// --- PROJECT MANAGEMENT ---
app.get("/api/projects", authUser, (req, res) => {
  const db = loadDB();
  const user = (req as any).user as UserProfile;

  if (user.role === "admin") {
    return res.json(db.projects);
  } else {
    // Standard employees only see projects they have tasks in! (Absolute restrictions/Data isolation)
    const myTasks = db.tasks.filter(t => t.assigned_to_id === user.id);
    const myProjectIds = Array.from(new Set(myTasks.map(t => t.project_id)));
    const filteredProjects = db.projects.filter(p => myProjectIds.includes(p.id));
    return res.json(filteredProjects);
  }
});

app.post("/api/projects", authUser, adminOnly, (req, res) => {
  const { client_id, title, track_type, budget, deadline, requirements, drive_url } = req.body;
  if (!client_id || !title || !track_type || !budget || !deadline || !requirements) {
    return res.status(400).json({ error: "يرجى تعبئة حقول المشروع الأساسية كاملة" });
  }

  const db = loadDB();
  const client = db.clients.find(c => c.id === client_id);
  if (!client) {
    return res.status(404).json({ error: "العميل المختار غير موجود" });
  }

  const newProject: Project = {
    id: "prj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    client_id,
    client_name: client.name,
    title,
    track_type,
    budget: Number(budget),
    deadline,
    requirements,
    drive_url: drive_url || "",
    created_at: new Date().toISOString()
  };

  db.projects.push(newProject);

  // Auto-log revenue setup? No, revenue should be logged explicitly in Finance & Vault when received.
  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "CREATE_PROJECT", `تم إنشاء مشروع جديد: ${title} للعميل ${client.name}`);

  saveDB(db);
  res.json(newProject);
});

// --- TASK MANAGEMENT ---
app.get("/api/tasks", authUser, (req, res) => {
  const db = loadDB();
  const user = (req as any).user as UserProfile;

  if (user.role === "admin") {
    res.json(db.tasks);
  } else {
    // STRICT DATA ISOLATION: Employee only sees their own assigned tasks
    const employeeTasks = db.tasks.filter(t => t.assigned_to_id === user.id);
    res.json(employeeTasks);
  }
});

app.post("/api/tasks", authUser, adminOnly, (req, res) => {
  const { project_id, title, assigned_to_id, deadline } = req.body;
  if (!project_id || !title || !assigned_to_id || !deadline) {
    return res.status(400).json({ error: "يرجى تعبئة حقول المهمة كاملة" });
  }

  const db = loadDB();
  const project = db.projects.find(p => p.id === project_id);
  if (!project) {
    return res.status(404).json({ error: "المشروع المختار غير موجود" });
  }

  const staff = db.users.find(u => u.id === assigned_to_id && u.status === "Approved");
  if (!staff) {
    return res.status(404).json({ error: "الموظف المختار غير موجود أو غير معتمد" });
  }

  const newTask: Task = {
    id: "tsk_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    project_id,
    project_title: project.title,
    title,
    assigned_to_id,
    assigned_to_name: staff.fullName || staff.email.split("@")[0], // Fallback name
    status: "Pending",
    deadline,
    created_at: new Date().toISOString()
  };

  db.tasks.push(newTask);

  // In-App Notification: Notify employee of task assignment
  db.notifications.unshift({
    id: "not_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    user_id: assigned_to_id,
    title: "مهمة جديدة موكلة إليك 📋",
    message: `تم تكليفك بمهمة "${title}" في مشروع "${project.title}"، آخر موعد للتسليم: ${deadline}`,
    is_read: false,
    created_at: new Date().toISOString()
  });

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "CREATE_TASK", 
    `تم إسناد مهمة "${title}" للموظف ${staff.email} بمشروع ${project.title}`
  );

  saveDB(db);
  res.json(newTask);
});

// Update Task (Employee updating status & delivery notes, or Admin modifying)
app.put("/api/tasks/:id", authUser, (req, res) => {
  const { id } = req.params;
  const { status, delivery_notes } = req.body;
  const user = (req as any).user as UserProfile;

  const db = loadDB();
  const taskIndex = db.tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: "المهمة غير موجودة" });
  }

  const task = db.tasks[taskIndex];

  // If standard employee, check if they are indeed assigned to this task
  if (user.role === "employee" && task.assigned_to_id !== user.id) {
    return res.status(403).json({ error: "غير مصرح لك بتعديل هذه المهمة" });
  }

  // If status is updated to completed, they must provide delivery notes
  if (status === "Completed" && !delivery_notes && user.role === "employee") {
    return res.status(400).json({ error: "يجب إدخال تفاصيل وملاحظات التسليم لروابط أو ملفات الشغل" });
  }

  const oldStatus = task.status;
  task.status = status;
  if (delivery_notes !== undefined) {
    task.delivery_notes = delivery_notes;
  }

  // Trigger Notifications
  if (status === "Completed" && oldStatus !== "Completed") {
    // Notify Admin that employee completed the task
    const admins = db.users.filter(u => u.role === "admin");
    admins.forEach(adm => {
      db.notifications.unshift({
        id: "not_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        user_id: adm.id,
        title: "تم تسليم مهمة بنجاح ✅",
        message: `قام الموظف (${user.email}) بتسليم المهمة "${task.title}" بمشروع "${task.project_title}" وملاحظاته: ${delivery_notes || "بدون"}`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    });
  }

  logAudit(
    db, 
    user.id, 
    user.email, 
    "UPDATE_TASK_STATUS", 
    `تم تعديل حالة المهمة "${task.title}" من ${oldStatus} إلى ${status}`
  );

  saveDB(db);
  res.json(task);
});

// Delete Task (Admin only)
app.delete("/api/tasks/:id", authUser, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const taskIndex = db.tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: "المهمة غير موجودة" });
  }

  const taskTitle = db.tasks[taskIndex].title;
  db.tasks.splice(taskIndex, 1);

  const admin = (req as any).user as UserProfile;
  logAudit(db, admin.id, admin.email, "DELETE_TASK", `تم حذف المهمة "${taskTitle}"`);

  saveDB(db);
  res.json({ message: "تم حذف المهمة بنجاح" });
});

// --- ADVANCED FINANCES & VAULT ---
app.get("/api/finances", authUser, adminOnly, (req, res) => {
  const db = loadDB();
  res.json({
    transactions: db.finances,
    auditLogs: db.auditLogs || []
  });
});

app.post("/api/finances", authUser, adminOnly, (req, res) => {
  const { type, amount, title, client_name, payment_method } = req.body;
  if (!type || !amount || !title || !payment_method) {
    return res.status(400).json({ error: "يرجى تعبئة جميع الحقول المطلوبة للمعاملة المالية" });
  }

  const db = loadDB();
  const creator = (req as any).user as UserProfile;

  const newTx: FinanceTransaction = {
    id: "tx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    type,
    amount: Number(amount),
    title,
    client_name: client_name || "",
    payment_method,
    creator_id: creator.id,
    creator_email: creator.email,
    created_at: new Date().toISOString()
  };

  db.finances.push(newTx);

  logAudit(
    db, 
    creator.id, 
    creator.email, 
    "ADD_FINANCE_TRANSACTION", 
    `تم تسجيل (${type === "revenue" ? "إيراد" : "مصروف"}) بقيمة ${amount} ج.م - العنوان: ${title}`
  );

  saveDB(db);
  res.json(newTx);
});

// Delete financial transaction - For Admins
app.delete("/api/finances/:id", authUser, adminOnly, (req, res) => {
  const { id } = req.params;
  const admin = (req as any).user as UserProfile;

  const db = loadDB();
  const txIndex = db.finances.findIndex(f => f.id === id);
  if (txIndex === -1) {
    return res.status(404).json({ error: "المعاملة المالية غير موجودة" });
  }

  const tx = db.finances[txIndex];
  db.finances.splice(txIndex, 1);

  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "DELETE_FINANCE_TRANSACTION", 
    `تم حذف معاملة مالية بقيمة ${tx.amount} ج.م - العنوان: ${tx.title}`
  );

  saveDB(db);
  res.json({ message: "تم حذف القيد المالي وتعديل الخزنة تلقائياً" });
});

// --- PAYROLL MODULE (ADMIN ONLY) ---
app.get("/api/payroll", authUser, adminOnly, (req, res) => {
  const db = loadDB();
  res.json(db.payroll);
});

app.post("/api/payroll", authUser, adminOnly, (req, res) => {
  const { employee_id, amount, month } = req.body;
  if (!employee_id || !amount || !month) {
    return res.status(400).json({ error: "يرجى تعبئة حقول مسير المرتب كاملة" });
  }

  const db = loadDB();
  const staff = db.users.find(u => u.id === employee_id && u.status === "Approved");
  if (!staff) {
    return res.status(404).json({ error: "الموظف غير موجود أو غير معتمد" });
  }

  const newRecord: PayrollRecord = {
    id: "pay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    employee_id,
    employee_name: staff.fullName || staff.email.split("@")[0],
    employee_email: staff.email,
    amount: Number(amount),
    month,
    status: "معلق",
    created_at: new Date().toISOString()
  };

  db.payroll.push(newRecord);

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "CREATE_PAYROLL", 
    `تم تسجيل مستحق مرتب للموظف ${staff.email} لشهر ${month} بقيمة ${amount} ج.م`
  );

  saveDB(db);
  res.json(newRecord);
});

// Update payroll status (Payout trigger - which deducts automatically from main vault)
app.put("/api/payroll/:id/pay", authUser, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const recordIndex = db.payroll.findIndex(p => p.id === id);
  if (recordIndex === -1) {
    return res.status(404).json({ error: "قيد المرتب غير موجود" });
  }

  const record = db.payroll[recordIndex];
  if (record.status === "تم الصرف") {
    return res.status(400).json({ error: "تم صرف هذا المرتب مسبقاً" });
  }

  record.status = "تم الصرف";
  record.payment_date = new Date().toISOString();

  // Deduct from Vault as Expense automatically!
  const creator = (req as any).user as UserProfile;
  const newTx: FinanceTransaction = {
    id: "tx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    type: "expense",
    amount: record.amount,
    title: `صرف مرتب الموظف ${record.employee_name} لشهر ${record.month}`,
    payment_method: "كاش", // Default
    creator_id: creator.id,
    creator_email: creator.email,
    created_at: new Date().toISOString()
  };

  db.finances.push(newTx);

  logAudit(
    db, 
    creator.id, 
    creator.email, 
    "PAY_EMPLOYEE_SALARY", 
    `تم صرف مرتب الموظف ${record.employee_email} بقيمة ${record.amount} ج.م لشهر ${record.month} وخصمه تلقائياً كـ (مصروف)`
  );

  // Notify the employee of payment!
  db.notifications.unshift({
    id: "not_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    user_id: record.employee_id,
    title: "تم إيداع راتبك الشهري 💸",
    message: `تم تأكيد صرف راتبك لشهر (${record.month}) بقيمة ${record.amount} ج.م. شكراً لجهودك الكبيرة!`,
    is_read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  res.json({ message: "تم تأكيد صرف الراتب بنجاح وخصمه من الخزنة", record });
});

app.delete("/api/payroll/:id", authUser, adminOnly, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const recordIndex = db.payroll.findIndex(p => p.id === id);
  if (recordIndex === -1) {
    return res.status(404).json({ error: "قيد المرتب غير موجود" });
  }

  const record = db.payroll[recordIndex];
  db.payroll.splice(recordIndex, 1);

  const admin = (req as any).user as UserProfile;
  logAudit(
    db, 
    admin.id, 
    admin.email, 
    "DELETE_PAYROLL", 
    `تم حذف قيد المرتب للموظف ${record.employee_email} لشهر ${record.month}`
  );

  saveDB(db);
  res.json({ message: "تم حذف قيد المرتب بنجاح" });
});

// --- SYSTEM STATUS & STRESS TEST API ---
app.get("/api/system/stress-test", authUser, adminOnly, (req, res) => {
  const memory = process.memoryUsage();
  const db = loadDB();
  
  // Simulate a bit of CPU workload (sine/cosine math) so a stress test registers real CPU stress
  let sum = 0;
  for (let i = 0; i < 50000; i++) {
    sum += Math.sin(i) * Math.cos(i);
  }

  res.json({
    status: "healthy",
    uptime: Math.round(process.uptime()),
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
    },
    sumResult: sum,
    dbStats: {
      users: db.users.length,
      clients: db.clients.length,
      projects: db.projects.length,
      tasks: db.tasks.length,
      finances: db.finances.length,
      payroll: db.payroll.length,
      auditLogs: (db.auditLogs || []).length
    }
  });
});

// --- NOTIFICATIONS API ---
app.get("/api/notifications", authUser, (req, res) => {
  const user = (req as any).user as UserProfile;
  const db = loadDB();
  
  // Filter notifications for current user
  const myNotifications = db.notifications.filter(n => n.user_id === user.id);
  res.json(myNotifications);
});

app.post("/api/notifications/read-all", authUser, (req, res) => {
  const user = (req as any).user as UserProfile;
  const db = loadDB();
  
  db.notifications.forEach(n => {
    if (n.user_id === user.id) {
      n.is_read = true;
    }
  });

  saveDB(db);
  res.json({ message: "تم قراءة كافة التنبيهات" });
});

// --- GOOGLE SIMULATED AUTH PAGE ---
app.get("/auth/google-simulated", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تسجيل الدخول باستخدام Google | LUMÉRÉ</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Cairo', sans-serif;
          background-color: #000000;
          color: #e5e5e5;
        }
      </style>
    </head>
    <body class="flex items-center justify-center min-h-screen p-4">
      <div class="w-full max-w-md bg-[#0b0c10] border border-[#1e2025] rounded-2xl p-8 shadow-2xl relative">
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-purple-600 to-blue-500 rounded-t-2xl"></div>
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-950 border border-neutral-900 mb-4 shadow-inner">
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.66l3.15-3.15C17.45 1.74 14.93 1 12 1 7.37 1 3.42 3.66 1.48 7.56l3.77 2.92C6.18 7.15 8.85 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.48z"/>
              <path fill="#FBBC05" d="M5.25 10.48c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.48 3.2C.54 5.08 0 7.18 0 9.4c0 2.22.54 4.32 1.48 6.2l3.77-2.92c-.23-.69-.36-1.42-.36-2.18z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.96-1.07 7.95-2.92l-3.66-2.84c-1.01.68-2.31 1.08-3.79 1.08-3.15 0-5.82-2.11-6.77-5.44l-3.77 2.92C3.42 20.34 7.37 23 12 23z"/>
            </svg>
          </div>
          <h1 class="text-xl font-bold text-white tracking-tight">تسجيل دخول Google الآمن</h1>
          <p class="text-xs text-neutral-400 mt-2">اختر حساباً للمتابعة والدخول إلى نظام LUMÉRÉ ERP</p>
        </div>

        <div class="space-y-3">
          <!-- Preset Users -->
          <button onclick="selectAccount('yousef555554321@gmail.com', 'يوسف (المدير العام)')" class="w-full flex items-center justify-between p-3.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-blue-500/30 rounded-xl transition-all duration-200 text-right group">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-sm">ي</div>
              <div>
                <p class="text-xs font-bold text-white group-hover:text-blue-400 transition">يوسف (المدير العام)</p>
                <p class="text-[10px] text-neutral-500 font-mono">yousef555554321@gmail.com</p>
              </div>
            </div>
            <span class="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/30 font-semibold px-2 py-0.5 rounded-lg">المدير العام</span>
          </button>

          <button onclick="selectAccount('mohamed.editor@gmail.com', 'محمد علي')" class="w-full flex items-center justify-between p-3.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-blue-500/30 rounded-xl transition-all duration-200 text-right group">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-sm">م</div>
              <div>
                <p class="text-xs font-bold text-white group-hover:text-blue-400 transition">محمد علي (مونتير)</p>
                <p class="text-[10px] text-neutral-500 font-mono font-sans">mohamed.editor@gmail.com</p>
              </div>
            </div>
            <span class="text-[9px] bg-neutral-900 text-neutral-400 border border-neutral-800 font-semibold px-2 py-0.5 rounded-lg">موظف جديد</span>
          </button>

          <!-- Custom Account form -->
          <div class="border-t border-neutral-900/80 my-4 pt-4">
            <label class="block text-xs font-semibold text-neutral-400 mb-2">أو تسجيل الدخول ببريد إلكتروني مخصص:</label>
            <div class="flex gap-2">
              <input type="email" id="custom-email" placeholder="name@example.com" class="flex-1 bg-neutral-950 border border-neutral-900 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono text-left" dir="ltr" />
              <button onclick="submitCustom()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-xl text-xs transition duration-200">متابعة</button>
            </div>
            <p id="error-msg" class="text-[10px] text-red-400 mt-2 hidden">يرجى إدخال بريد إلكتروني صالح للمتابعة</p>
          </div>
        </div>

        <div class="text-[10px] text-neutral-600 text-center mt-6">
          يتكامل هذا المعالج مع نظام محاكاة Google OAuth المتكامل لبيئة عمل LUMÉRÉ.
        </div>
      </div>

      <script>
        function selectAccount(email, name) {
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              email: email,
              name: name
            }, '*');
            window.close();
          } else {
            alert("فشل العثور على النافذة الرئيسية. يرجى محاولة فتح تسجيل الدخول من خلال النظام.");
          }
        }

        function submitCustom() {
          const emailInput = document.getElementById('custom-email');
          const email = emailInput.value.trim();
          const errorMsg = document.getElementById('error-msg');
          
          if (!email || !email.includes('@')) {
            errorMsg.classList.remove('hidden');
            return;
          }
          errorMsg.classList.add('hidden');
          const name = email.split('@')[0];
          selectAccount(email, name);
        }
      </script>
    </body>
    </html>
  `);
});

// --- GOOGLE SIGN-IN ENDPOINT ---
app.post("/api/auth/google-signin", (req, res) => {
  const { email, fullName } = req.body;
  if (!email) {
    return res.status(400).json({ error: "البريد الإلكتروني من جوجل مطلوب" });
  }

  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.trim().toLowerCase() === normalizedEmail);

  if (user) {
    if (user.status === "Pending Approval") {
      return res.status(403).json({ error: "حسابك قيد المراجعة والقبول من قِبل الإدارة. يرجى الانتظار" });
    }
    const { password: _, ...safeUser } = user;
    return res.json({ isNewUser: false, user: safeUser });
  } else {
    // New registration via Google. We return isNewUser true.
    // The client will prefill the email and name in onboarding screen.
    return res.json({ 
      isNewUser: true, 
      email: normalizedEmail, 
      fullName: fullName || normalizedEmail.split("@")[0] 
    });
  }
});

// --- FORGOT PASSWORD ENDPOINT ---
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني" });
  }

  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  const userIndex = db.users.findIndex(u => u.email.trim().toLowerCase() === normalizedEmail);

  if (userIndex === -1) {
    return res.status(404).json({ error: "البريد الإلكتروني المدخل غير مسجل لدينا في النظام" });
  }

  // Generate secure token using crypto
  const token = crypto.randomBytes(20).toString("hex");
  const expires = Date.now() + 3600000; // 1 Hour limit

  db.users[userIndex].resetPasswordToken = token;
  db.users[userIndex].resetPasswordExpires = expires;

  saveDB(db);

  // Return simulated reset link so it is extremely easy to test in preview sandbox
  const resetLink = `/reset-password?token=${token}`;
  res.json({
    message: "تم توليد رابط إعادة تعيين كلمة المرور بنجاح للمحاكاة.",
    resetLink: resetLink
  });
});

// --- RESET PASSWORD ENDPOINT ---
app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "البيانات المطلوبة غير كاملة" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => 
    u.resetPasswordToken === token && 
    u.resetPasswordExpires !== undefined && 
    u.resetPasswordExpires > Date.now()
  );

  if (userIndex === -1) {
    return res.status(400).json({ error: "رابط إعادة التعيين غير صالح أو انتهت صلاحيته" });
  }

  // Save new password
  db.users[userIndex].password = newPassword;
  
  // Clear token fields
  delete db.users[userIndex].resetPasswordToken;
  delete db.users[userIndex].resetPasswordExpires;

  saveDB(db);

  res.json({ message: "تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول باستخدامها." });
});

// --- CHANGE PASSWORD ENDPOINT (IN-APP) ---
app.post("/api/auth/change-password", authUser, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "البيانات المطلوبة غير كاملة" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
  }

  const currentUser = (req as any).user;
  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === currentUser.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  db.users[userIndex].password = newPassword;
  saveDB(db);

  res.json({ message: "تم تحديث كلمة المرور بنجاح في الخادم الرئيسي" });
});

// Ensure directory layout for builds and serve static Vite content
const distPath = path.join(process.cwd(), "dist");

if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    
    // Fallback route for SPA in development
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  };
  startVite();
} else {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const serverInstance = app.listen(PORT, "0.0.0.0", () => {
  console.log(`LUMÉRÉ Backend running on port ${PORT}`);
});

serverInstance.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[Warning] Port ${PORT} is already in use. A backend server is already running.`);
  } else {
    console.error("[Server Error]", err);
  }
});
