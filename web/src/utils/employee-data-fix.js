/**
 * This is a fix for the Employee Data handling issues in the Boss Menu
 * Save this as 'employee-data-fix.js' in your web/src/utils directory
 * Then import and use these functions in your components
 */

/**
 * Safely extracts an employee ID from various possible formats
 * @param {any} employee - Employee object or ID
 * @returns {number|string|null} - The extracted ID or null if invalid
 */
export function safelyExtractEmployeeId(employee) {
    // If it's already a number or string, return it
    if (typeof employee === 'number' || typeof employee === 'string') {
      return employee;
    }
    
    // If it's an object with an id property
    if (employee && typeof employee === 'object' && employee.id) {
      // Convert string IDs to numbers if possible
      if (typeof employee.id === 'string') {
        const parsed = parseInt(employee.id, 10);
        return isNaN(parsed) ? employee.id : parsed;
      }
      return employee.id;
    }
    
    // If it's an object with an identifier property (backend format)
    if (employee && typeof employee === 'object' && employee.identifier) {
      // Convert string identifiers to numbers if possible
      if (typeof employee.identifier === 'string') {
        const parsed = parseInt(employee.identifier, 10);
        return isNaN(parsed) ? employee.identifier : parsed;
      }
      return employee.identifier;
    }
    
    // If we can't extract an ID, return null
    console.error('[HCYK_BOSSACTIONS] Could not extract ID from employee:', employee);
    return null;
  }
  
  /**
   * Safely converts backend employee data to frontend format
   * @param {Object} emp - Backend employee data
   * @returns {Object} - Frontend employee data
   */
  export function convertEmployeeData(emp) {
    if (!emp) {
      console.error('[HCYK_BOSSACTIONS] Empty employee data passed to converter');
      return null;
    }
    
    let id;
    
    // Extract ID safely
    if (emp.identifier !== undefined) {
      if (typeof emp.identifier === 'number') {
        id = emp.identifier;
      } else if (typeof emp.identifier === 'string') {
        const parsed = parseInt(emp.identifier, 10);
        id = isNaN(parsed) ? emp.identifier : parsed;
      } else {
        console.warn('[HCYK_BOSSACTIONS] Invalid identifier type:', typeof emp.identifier);
        id = String(emp.identifier); // Convert to string as fallback
      }
    } else if (emp.id !== undefined) {
      id = emp.id;
    } else {
      console.error('[HCYK_BOSSACTIONS] Employee has no ID or identifier:', emp);
      id = 0; // Fallback ID
    }
    
    // Create transformed employee object
    return {
      id: id,
      name: `${emp.firstname || ''} ${emp.lastname || ''}`.trim() || 'Unknown',
      role: emp.grade_name || emp.role || 'Unknown',
      salary: emp.salary || 0,
      level: emp.grade || emp.level || 0,
      weeklyPlaytime: emp.weeklyPlaytime || 0,
      performance: emp.performance || 75
    };
  }
  
  /**
   * Enhanced API request function for employee actions
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} employee - Employee object
   * @returns {Promise} - API response
   */
  export async function employeeAction(endpoint, data = {}, employee) {
    // Extract employee ID safely
    const employeeId = safelyExtractEmployeeId(employee);
    
    if (!employeeId) {
      console.error(`[HCYK_BOSSACTIONS] Invalid employee ID for ${endpoint}:`, employee);
      return { success: false, message: "Neplatný identifikátor zaměstnance" };
    }
    
    // Create the request data with the extracted ID
    const requestData = {
      ...data,
      identifier: employeeId
    };
    
    console.log(`[HCYK_BOSSACTIONS] Sending ${endpoint} request:`, requestData);
    
    try {
      // You'll need to import your actual API call function
      // This is just a placeholder for the implementation
      const response = await fetch(`https://hcyk_bossmenu/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      return await response.json();
    } catch (error) {
      console.error(`[HCYK_BOSSACTIONS] Error in ${endpoint}:`, error);
      return { success: false, message: "Chyba při zpracování požadavku" };
    }
  }