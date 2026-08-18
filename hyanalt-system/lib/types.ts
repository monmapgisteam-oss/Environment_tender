/** Гэрээт ажлын гүйцэтгэлийн хяналтын системийн үндсэн төрлүүд */

export type Status =
  | "planned" // эхлээгүй
  | "active" // хэрэгжиж буй
  | "warn1" // урьдчилсан сануулга илгээсэн
  | "warn2" // эцсийн сануулга илгээсэн
  | "level2" // хугацаа хэтэрч, хэлтсийн даргад мэдэгдсэн
  | "level3" // ноцтой хоцролт, газрын даргад мэдэгдсэн
  | "done" // хугацаандаа ирүүлсэн
  | "late"; // хоцорч ирүүлсэн

export type RuleKey = "reminder" | "final" | "level2" | "level3";

export interface Recipient {
  name: string;
  role: string;
  org: string;
  /** Шатлал ахисны улмаас нэмэгдсэн хүлээн авагч эсэх */
  escalated?: boolean;
}

/** Захиалагч байгууллага ба хөтөлбөрийн ерөнхий мэдээлэл */
export interface Program {
  client: string;
  name: string;
  start: string;
  end: string;
}

/** Гүйцэтгэгч компани — гэрээ тус бүр нэг компанид харгалзана */
export interface Company {
  id: string;
  no: number;
  name: string;
  contractNo: string;
  /** Гэрээгээр гүйцэтгэх ажлын чиглэл */
  scope: string;
  start: string;
  end: string;
  /** Захиалагч талаас хариуцах хэлтэс */
  deptId: string;
  /** Гэрээний дүн (сая төгрөг) */
  amount: number;
  pm: Recipient;
  ceo: Recipient;
}

export interface Stage {
  id: string;
  companyId: string;
  no: number;
  name: string;
  short: string;
  start: string;
  end: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  head: string;
  source: string;
}

export interface Task {
  id: string;
  companyId: string;
  deptId: string;
  no: number;
  title: string;
}

export interface Milestone {
  id: string;
  taskId: string;
  companyId: string;
  deptId: string;
  stageId: string;
  deadline: string;
  /** Гүйцэтгэгчээс тайлан хүлээн авсан огноо */
  submittedAt: string | null;
  /** Хүнээр гараар бүртгэсэн эсэх (туршилтын дуурайлт үүнийг дарж бичихгүй) */
  manual?: boolean;
  /** Зөвхөн туршилтын өгөгдөл: тайлан ирэх төлөвлөгдсөн огноо (null = ирэхгүй) */
  demoArrivesAt: string | null;
}

export interface Notification {
  id: string;
  milestoneId: string;
  companyId: string;
  rule: RuleKey;
  /** Мэдэгдэл үүсэх ёстой байсан огноо */
  dueOn: string;
  /** Систем бодитоор илгээсэн огноо/цаг */
  sentAt: string;
  subject: string;
  body: string;
  recipients: Recipient[];
  channels: string[];
  delivered: boolean;
}

export interface Settings {
  reminderLead: number;
  finalLead: number;
  deptHeadAfter: number;
  directorAfter: number;
  businessDaysOnly: boolean;
  useReviewDate: boolean;
  reviewDate: string;
  demoIncomingReports: boolean;
  lastRunAt: string | null;
}

export interface People {
  /** Захиалагч байгууллагын дарга */
  director: Recipient;
}

export interface DB {
  version: number;
  program: Program;
  people: People;
  companies: Company[];
  stages: Stage[];
  departments: Department[];
  tasks: Task[];
  milestones: Milestone[];
  notifications: Notification[];
  settings: Settings;
}

/** Дэлгэцэд харуулах бэлэн загвар */
export interface MilestoneView {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyNo: number;
  contractNo: string;
  deptId: string;
  deptName: string;
  deptHead: string;
  stageNo: number;
  stageName: string;
  stageStart: string;
  deadline: string;
  status: Status;
  /** Эерэг = үлдсэн хоног, сөрөг = хэтэрсэн хоног */
  daysLeft: number;
  submittedAt: string | null;
  steps: LadderStep[];
  lastNotification: Notification | null;
}

export interface LadderStep {
  rule: RuleKey;
  label: string;
  dueOn: string;
  state: "sent" | "pending" | "skipped";
  recipients: Recipient[];
}
