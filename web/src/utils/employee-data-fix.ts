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
   * @returns The extracted ID or null if invalid
   */
  export function safelyExtractEmployeeId(employee: any): string | number | null {
    console.log('[DEBUG] safelyExtractEmployeeId input:', JSON.stringify(employee));
    
    if (typeof employee === 'number' || typeof employee === 'string') {
      console.log('[DEBUG] Employee is already number or string type:', employee);
      return employee;
    }
    
    if (employee && typeof employee === 'object' && employee.id !== undefined) {
      console.log('[DEBUG] Found id property in employee object:', employee.id);
      if (typeof employee.id === 'string') {
        const parsed = parseInt(employee.id, 10);
        console.log('[DEBUG] Parsed string ID to number:', parsed);
        return isNaN(parsed) ? employee.id : parsed;
      }
      return employee.id;
    }
    
    if (employee && typeof employee === 'object' && employee.identifier !== undefined) {
      console.log('[DEBUG] Found identifier property in employee object:', employee.identifier);
      // Convert string identifiers to numbers if possible
      if (typeof employee.identifier === 'string') {
        const parsed = parseInt(employee.identifier, 10);
        console.log('[DEBUG] Parsed string identifier to number:', parsed);
        return isNaN(parsed) ? employee.identifier : parsed;
      }
      return employee.identifier;
    }
    
    console.error('[DEBUG] FAILED to extract ID. Employee object keys:', employee ? Object.keys(employee) : 'null');
    console.error('[DEBUG] Complete employee object:', employee);
    return null;
  }
  
  /**
   * Safely converts employee data to frontend format
   * @param emp - Raw employee data
   * @returns Formatted employee data
   */
  export function convertEmployeeData(emp: RawEmployee): Employee {
    console.log('[DEBUG] convertEmployeeData input:', JSON.stringify(emp));
    
    if (!emp) {
      console.error('[DEBUG] Empty employee data passed to converter');
      return {
        id: 0,
        name: 'Unknown',
        role: 'Unknown',
        salary: 0,
        performance: 75
      };
    }
    
    let id: string | number = 0;
    
    if (emp.identifier !== undefined) {
      console.log('[DEBUG] Using identifier property:', emp.identifier);
      if (typeof emp.identifier === 'number') {
        id = emp.identifier;
      } else if (typeof emp.identifier === 'string') {
        const parsed = parseInt(emp.identifier, 10);
        id = isNaN(parsed) ? emp.identifier : parsed;
        console.log('[DEBUG] Parsed identifier to:', id);
      } else {
        console.warn('[DEBUG] Invalid identifier type:', typeof emp.identifier);
        id = String(emp.identifier);
      }
    } else if (emp.id !== undefined) {
      console.log('[DEBUG] Using id property:', emp.id);
      id = emp.id;
    } else {
      console.error('[DEBUG] Employee has no ID or identifier:', Object.keys(emp));
      id = 0;
    }
    
    const transformedEmployee: Employee = {
      id: id,
      name: emp.name || `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
      role: emp.role || emp.grade_name || 'Unknown',
      salary: emp.salary || 0,
      level: emp.level || emp.grade || 0,
      weeklyPlaytime: emp.weeklyPlaytime || 0,
      performance: emp.performance || 75
    };
    
    console.log('[DEBUG] Transformed employee:', JSON.stringify(transformedEmployee));
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
    console.log('[DEBUG] employeeAction called for endpoint:', endpoint);
    console.log('[DEBUG] employeeAction data:', JSON.stringify(data));
    console.log('[DEBUG] employeeAction employee:', JSON.stringify(employee));
    
    const employeeId = safelyExtractEmployeeId(employee);
    
    if (!employeeId) {
      console.error(`[DEBUG] Invalid employee ID for ${endpoint}`);
      return { success: false, message: "Neplatný identifikátor zaměstnance" } as unknown as T;
    }
    
    const requestData = {
      ...data,
      identifier: employeeId
    };
    
    console.log(`[DEBUG] Final ${endpoint} request data:`, JSON.stringify(requestData));
    
    try {
      const response = await fetch(`https://hcyk_bossmenu/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const responseData = await response.json();
      console.log(`[DEBUG] ${endpoint} response:`, JSON.stringify(responseData));
      return responseData;
    } catch (error) {
      console.error(`[DEBUG] Error in ${endpoint}:`, error);
      return { success: false, message: "Chyba při zpracování požadavku" } as unknown as T;
    }
  }

export function safeJsonParse<T>(text: string): T {
  if (!text || text.trim() === '') return {} as T;
  
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('[DEBUG] JSON parse error:', e);
    console.error('[DEBUG] Attempted to parse:', text);
    return {} as T;
  }
}

export const fetchWithFallback = async <T = any>(
  endpoint: string,
  data: any,
  useMock: boolean = false
): Promise<T> => {
  data = data || {};
  
  if (data && data.job) {
    data.job = ensureJobString(data.job);
  }
  
  try {
    const cleanEndpoint = endpoint.includes(':') ? endpoint.split(':')[1] : endpoint;
    
    const response = await fetch(`https://hcyk_bossmenu/${cleanEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    if (!text) {
      console.warn(`[DEBUG] Empty response from ${endpoint}`);
      return {} as T;
    }

    return safeJsonParse(text) as T;
  } catch (error) {
    console.warn(`[DEBUG] Error fetching ${endpoint}, ${useMock ? 'using mock data' : 'throwing error'}:`, error);
    
    if (useMock) {
      console.info(`[DEBUG] Using mock data for ${endpoint}`);
      const cleanEndpoint = endpoint.includes(':') ? endpoint.split(':')[1] : endpoint;
      return getMockData(cleanEndpoint, data) as T;
    }
    
    throw error;
  }
};

