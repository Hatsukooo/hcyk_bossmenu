// Stávající typy
export interface Employee {
  id: number;
  name: string;
  role: string;
  salary: number;
  level?: number;
  performance: number;
}

export interface HistoryItem {
  date: string;
  type: string;
  amount: string;
  note: string;
}

export interface ActivityItem {
  date: string;
  activity: string;
  hours: number;
}

export interface EmployeeHistory {
  [key: number]: HistoryItem[];
}

export interface EmployeeActivities {
  [key: number]: ActivityItem[];
}

export interface JobData {
  id?: number;
  name: string;
  label: string;
  grades: JobGrade[];
  color?: string;
  description?: string;
  maxMembers?: number;
  hideFromPublic?: boolean;
}

// Interface for job permissions
export interface JobPermission {
  name: string;
  grades: number[];
}

export interface JobPermissions {
  [key: string]: {
    grades: number[];
  };
}

export interface JobGrade {
  id?: number;
  job_name: string;
  grade: number;
  name: string;
  label: string;
  salary: number;
}

// Přidané chybějící typy
export interface FinanceData {
  month: string;
  příjmy: number;
  výdaje: number;
  zisk: number;
}

export interface ExpenseData {
  name: string;
  hodnota: number;
  barva: string;
}

export interface Position {
  id: number;
  name: string;
  baseSalary: number;
  requirements: string;
}

export interface Candidate {
  id: number;
  name: string;
  skills: string;
}

export interface Player {
  id: number;
  name: string;
}

export interface EmployeeBackend {
  identifier: string;
  firstname: string;
  lastname: string;
  grade: number;
  grade_name: string;
  grade_label?: string;
  salary?: number;
}

declare global {
  interface Window {
    PlayerData?: {
      job?: {
        name: string;
        grade?: number;
        grade_name?: string;
      };
    };
  }
}

export const getFallbackJob = () => {
  return window.PlayerData?.job?.name || 'police';
};

export function isEmployeeBackend(emp: any): emp is EmployeeBackend {
  return (
    typeof emp.identifier === 'string' &&
    typeof emp.firstname === 'string' &&
    typeof emp.lastname === 'string' &&
    typeof emp.grade === 'number'
  );
}

export function convertBackendToEmployee(emp: EmployeeBackend): Employee {
  return {
    id: Number(emp.identifier),
    name: `${emp.firstname} ${emp.lastname}`,
    role: emp.grade_name,
    salary: emp.salary || 0,
    level: emp.grade,
    performance: 75
  };
}