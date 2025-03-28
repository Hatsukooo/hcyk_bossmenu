/**
 * Makes a fetch request to a FiveM NUI endpoint with proper error handling
 * @param endpoint The endpoint name without the https://resourceName/ prefix
 * @param data The data to send in the request body
 * @returns A promise that resolves to the parsed JSON response
 */
export const fetchNUI = async <T = any>(endpoint: string, data: any): Promise<T> => {
  try {
    const resourceName = (window as any).GetParentResourceName 
      ? (window as any).GetParentResourceName() 
      : "hcyk_bossmenu";
      
    const response = await fetch(`https://${resourceName}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (jsonError) {
      throw new Error(`Invalid JSON response`);
    }
  } catch (error) {
    throw error;
  }
};

export const getFallbackJob = (): string => {
  if (window.PlayerData?.job?.name) {
    return window.PlayerData.job.name;
  }
  
  if (window.latestJobData && typeof window.latestJobData === 'string') {
    return window.latestJobData;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const jobFromUrl = urlParams.get('job');
  if (jobFromUrl) {
    return jobFromUrl;
  }
  
  return "";
};

export const ensureJobString = (job: any): string => {
  if (typeof job === 'string') {
    return job;
  }
  if (typeof job === 'object' && job !== null && job.name) {
    return job.name;
  }
  return getFallbackJob();
};

/**
 * Mock data function for development when backend is not available
 * @param endpoint The endpoint that was called
 * @param data The data that was sent
 * @returns Mock data for development
 */
export const getMockData = (endpoint: string, data: any): any => {
  // Mock data here
  switch (endpoint) {
    case 'getEmployees':
      return [
        { identifier: '1', firstname: 'John', lastname: 'Doe', grade: 3, grade_name: 'boss', salary: 5000, performance: 85 },
        { identifier: '2', firstname: 'Jane', lastname: 'Smith', grade: 2, grade_name: 'deputy', salary: 4000, performance: 72 },
        { identifier: '3', firstname: 'Mike', lastname: 'Johnson', grade: 1, grade_name: 'officer', salary: 3000, performance: 65 }
      ];
    case 'getSocietyMoney':
      return 250000;
    case 'getFinancialStats':
      return {
        income: 45000,
        expenses: 25000,
        netProfit: 20000
      };
    case 'getJobData':
      return {
        name: data.job || 'police',
        label: data.job === 'police' ? 'Police Department' : (data.job === 'ambulance' ? 'Emergency Services' : 'Faction'),
        grades: [
          { id: 1, job_name: data.job, grade: 0, name: 'recruit', label: 'Rekrut', salary: 2000 },
          { id: 2, job_name: data.job, grade: 1, name: 'officer', label: 'Důstojník', salary: 3000 },
          { id: 3, job_name: data.job, grade: 2, name: 'deputy', label: 'Zástupce', salary: 4000 },
          { id: 4, job_name: data.job, grade: 3, name: 'boss', label: 'Šéf', salary: 5000 }
        ]
      };
    case 'getJobSettings':
      return {
        success: true,
        label: data.job === 'police' ? 'Police Department' : (data.job === 'ambulance' ? 'Emergency Services' : 'Faction'),
        settings: {
          description: 'Mock description for ' + data.job
        }
      };
    case 'getEmployeesPlaytime':
      const mockPlaytimeData: {[key: string]: number} = {
        '1': 25,
        '2': 18,
        '3': 12
      };
      return mockPlaytimeData;
    default:
      return {};
  }
};

/**
 * Utility function that attempts to fetch data from the NUI and falls back to mock data if configured
 * @param endpoint The endpoint to fetch from
 * @param data The data to send
 * @param useMock Whether to use mock data if fetch fails
 * @returns The response data
 */
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
    // Try without prefix first
    const cleanEndpoint = endpoint.includes(':') ? endpoint.split(':')[1] : endpoint;
    
    try {
      const result = await fetchNUI<T>(cleanEndpoint, data);
      
      // Check if result is valid and not empty
      if (result && typeof result === 'object' && Object.keys(result as object).length > 0) {
        return result;
      }
    } catch (firstError) {
      // Continue to next attempt
    }
    
    // If that fails, try with prefix
    if (!endpoint.includes(':')) {
      const prefixedEndpoint = `hcyk_bossactions:${endpoint}`;
      
      try {
        const result = await fetchNUI<T>(prefixedEndpoint, data);
        
        // Check if result is valid and not empty
        if (result && typeof result === 'object' && Object.keys(result as object).length > 0) {
          return result;
        }
      } catch (secondError) {
        // Continue to fallback
      }
    }
    
    // If both attempts fail and mock data is allowed, use it
    if (useMock) {
      return getMockData(cleanEndpoint, data) as T;
    }
    
    throw new Error(`Failed to fetch data from ${endpoint}`);
  } catch (error) {
    if (useMock) {
      const cleanEndpoint = endpoint.includes(':') ? endpoint.split(':')[1] : endpoint;
      return getMockData(cleanEndpoint, data) as T;
    }
    
    throw error;
  }
};