// Clean version of employee-data-fix.ts without debug prints
export interface RawEmployee {
  identifier?: string | number;
  id?: string | number;
  firstname?: string;
  lastname?: string;
  grade?: number;
  grade_name?: string;
  grade_label?: string;
  salary?: number;
  weeklyPlaytime?: number;
  performance?: number;
  role?: string;
  level?: number;
  name?: string;
  [key: string]: any; 
}

export interface Employee {
  id: string | number;
  name: string;
  role: string;
  salary: number;
  level?: number;
  weeklyPlaytime?: number;
  performance?: number;
}

/**
 * Safely extracts an employee ID from various possible formats
 * @param employee - Employee object or ID
 * @returns The extracted ID as string or null if invalid
 */
export function safelyExtractEmployeeId(employee: any): string | null {
  // Case 1: Employee is already a primitive value
  if (employee === null || employee === undefined) {
    return null;
  }
  
  if (typeof employee === 'number') {
    return String(employee);
  }
  
  if (typeof employee === 'string') {
    // Don't try to parse strings to numbers - keep them as strings
    return employee === 'NaN' || employee === 'undefined' || employee === 'null' ? null : employee;
  }
  
  // Case 2: Employee is an object with id property
  if (employee && typeof employee === 'object') {
    // First try the id property
    if (employee.id !== undefined) {
      // Handle all possible types safely
      if (typeof employee.id === 'string') {
        return employee.id === 'NaN' || employee.id === 'undefined' || employee.id === 'null' ? null : employee.id;
      }
      
      if (typeof employee.id === 'number') {
        return isNaN(employee.id) ? null : String(employee.id);
      }
      
      // For any other type, convert to string
      return String(employee.id);
    }
    
    // Then try the identifier property
    if (employee.identifier !== undefined) {
      // Handle all possible types safely
      if (typeof employee.identifier === 'string') {
        return employee.identifier === 'NaN' || employee.identifier === 'undefined' || employee.identifier === 'null' 
          ? null : employee.identifier;
      }
      
      if (typeof employee.identifier === 'number') {
        return isNaN(employee.identifier) ? null : String(employee.identifier);
      }
      
      // For any other type, convert to string
      return String(employee.identifier);
    }
  }
  
  return null;
}

/**
 * Safely converts employee data to frontend format
 * @param emp - Raw employee data
 * @returns Formatted employee data
 */
export function convertEmployeeData(emp: RawEmployee): Employee {
  if (!emp) {
    return {
      id: "0",
      name: 'Unknown',
      role: 'Unknown',
      salary: 0,
      performance: 75
    };
  }
  
  // Extract ID safely
  let id = safelyExtractEmployeeId(emp) || "0";
  
  // Build name from firstname and lastname or use name directly
  let name: string;
  if (emp.name) {
    name = emp.name;
  } else if (emp.firstname || emp.lastname) {
    name = `${emp.firstname || ''} ${emp.lastname || ''}`.trim();
  } else {
    name = 'Unknown';
  }
  
  // Get the role from various possible fields, prioritizing grade_label
  let role = 'Unknown';
  if (emp.grade_label) {
    role = emp.grade_label;
  } else if (emp.grade_name) {
    role = emp.grade_name;
  } else if (emp.role) {
    role = emp.role;
  }
  
  const transformedEmployee: Employee = {
    id: id,
    name: name || 'Unknown',
    role: role,
    salary: typeof emp.salary === 'number' ? emp.salary : 0,
    level: typeof emp.level === 'number' ? emp.level : (typeof emp.grade === 'number' ? emp.grade : 0),
    weeklyPlaytime: typeof emp.weeklyPlaytime === 'number' ? emp.weeklyPlaytime : 0,
    performance: typeof emp.performance === 'number' ? emp.performance : 75
  };
  
  return transformedEmployee;
}

/**
 * Enhanced API request function for employee actions
 * @param endpoint - API endpoint
 * @param data - Request data
 * @param employee - Employee object
 * @returns API response promise
 */
export async function employeeAction<T = any>(
  endpoint: string, 
  data: Record<string, any> = {}, 
  employee: RawEmployee | Employee | string | number
): Promise<T> {
  const employeeId = safelyExtractEmployeeId(employee);
  
  if (!employeeId) {
    return { success: false, message: "Neplatný identifikátor zaměstnance" } as unknown as T;
  }
  
  const requestData = {
    ...data,
    identifier: employeeId
  };
  
  try {
    const response = await fetch(`https://hcyk_bossmenu/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    // Handle empty responses
    const text = await response.text();
    if (!text || text.trim() === '') {
      return { success: false, message: "Prázdná odpověď od serveru" } as unknown as T;
    }
    
    try {
      const responseData = JSON.parse(text);
      return responseData;
    } catch (e) {
      return { success: false, message: "Chyba při zpracování odpovědi" } as unknown as T;
    }
  } catch (error) {
    return { success: false, message: "Chyba při zpracování požadavku" } as unknown as T;
  }
}

export function safeJsonParse<T>(text: string): T {
  if (!text || text.trim() === '') return {} as T;
  
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    return {} as T;
  }
}