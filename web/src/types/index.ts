// types/index.ts
export interface Employee {
  id: number;
  name: string;
  role: string;
  salary: number;
  level?: number;
  weeklyPlaytime?: number;
  performance?: number; // Added this line to fix TypeScript errors
}

export interface HistoryItem {
  date: string;
  type: string;
  amount: string;
  note: string;
}

export interface EmployeeHistory {
  [key: number]: HistoryItem[];
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

// Finance types
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
  weeklyPlaytime?: number;
  performance?: number;
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
    latestJobData?: string;
  }
}

export const getFallbackJob = (): string => {
  const jobFromPlayerData = window.PlayerData?.job?.name;
  const jobFromMessage = window.latestJobData;
  return jobFromPlayerData || jobFromMessage || "";
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
  let id: number;
  
  if (emp.identifier) {
    if (typeof emp.identifier === 'number') {
      id = emp.identifier;
    } else if (typeof emp.identifier === 'string') {
      const parsed = parseInt(emp.identifier, 10);
      id = isNaN(parsed) ? 0 : parsed;
    } else {
      id = 0;
    }
  } else {
    id = 0;
  }
  
  return {
    id: id,
    name: `${emp.firstname || 'Unknown'} ${emp.lastname || ''}`.trim(),
    role: emp.grade_name || 'Unknown',
    salary: emp.salary || 0,
    level: emp.grade || 0,
    weeklyPlaytime: emp.weeklyPlaytime || 0,
    performance: emp.performance || 75
  };
}