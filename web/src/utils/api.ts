// src/utils/api.ts

/**
 * Makes a fetch request to a FiveM NUI endpoint with proper error handling
 * @param endpoint The endpoint name without the https://hcyk_bossmenu/ prefix
 * @param data The data to send in the request body
 * @returns A promise that resolves to the parsed JSON response
 */
export const fetchNUI = async <T = any>(endpoint: string, data: any): Promise<T> => {
  try {
    const response = await fetch(`https://hcyk_bossmenu/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    // For empty responses, return an empty object
    const text = await response.text();
    if (!text) {
      console.warn(`Empty response from ${endpoint}`);
      return {} as T;
    }

    // Try to parse the JSON
    try {
      return JSON.parse(text) as T;
    } catch (jsonError) {
      console.error(`Failed to parse JSON from ${endpoint}:`, text);
      throw new Error(`Invalid JSON response: ${jsonError}`);
    }
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Get fallback job name from player data or return default
 */
export const getFallbackJob = (): string => {
  return window.PlayerData?.job?.name || 'police';
};

/**
 * Mock data function for development when backend is not available
 * @param endpoint The endpoint that was called
 * @param data The data that was sent
 * @returns Mock data for development
 */
export const getMockData = (endpoint: string, data: any): any => {
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
    case 'getNearbyPlayers':
      return [
        { id: 1, name: 'Player 1' },
        { id: 2, name: 'Player 2' },
        { id: 3, name: 'Player 3' }
      ];
    case 'getRanks':
      return [
        { id: 1, job_name: data.job, grade: 0, name: 'recruit', label: 'Rekrut', salary: 2000 },
        { id: 2, job_name: data.job, grade: 1, name: 'officer', label: 'Důstojník', salary: 3000 },
        { id: 3, job_name: data.job, grade: 2, name: 'deputy', label: 'Zástupce', salary: 4000 },
        { id: 4, job_name: data.job, grade: 3, name: 'boss', label: 'Šéf', salary: 5000 }
      ];
    case 'getEmployeePlaytime':
      // Generate random but somewhat consistent data for a week
      const daysOfWeek = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
      const result = [];
      
      // Create consistent but random data
      const seed = parseInt(data.identifier) || 1;
      const baseHours = 2 + (seed % 5); // Between 2-7 hours base
      
      for (let i = 0; i < 7; i++) {
        // Generate consistent "random" values based on day and ID
        const dayVariance = Math.sin(i * seed) * 2; // -2 to +2 variance
        const hours = Math.max(0, Math.min(10, baseHours + dayVariance));
        const roundedHours = Math.round(hours * 10) / 10; // Round to 1 decimal place
        
        result.push({
          day: daysOfWeek[i],
          hours: roundedHours,
          performance: Math.floor((roundedHours / 2) * 0.57 * 100) // Same formula as server
        });
      }
      return result;
    case 'getJobData':
      return {
        name: data.job,
        label: data.job.charAt(0).toUpperCase() + data.job.slice(1),
        description: 'Default job description',
        color: '#4a90e2',
        grades: [
          { grade: 0, name: 'recruit', label: 'Rekrut', salary: 2000 },
          { grade: 1, name: 'officer', label: 'Důstojník', salary: 3000 },
          { grade: 2, name: 'deputy', label: 'Zástupce', salary: 4000 },
          { grade: 3, name: 'boss', label: 'Šéf', salary: 5000 }
        ]
      };
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
  try {
    // Add debug logging to track request
    console.log(`Attempting to fetch from ${endpoint} with data:`, data);
    
    const response = await fetchNUI<T>(endpoint, data);
    
    // Add debug logging of successful response
    console.log(`Successful response from ${endpoint}:`, response);
    
    return response;
  } catch (error) {
    console.warn(`Error fetching ${endpoint}, ${useMock ? 'using mock data' : 'throwing error'}:`, error);
    
    if (useMock) {
      console.info(`Using mock data for ${endpoint}`);
      const mockData = getMockData(endpoint, data) as T;
      console.log(`Mock data for ${endpoint}:`, mockData);
      return mockData;
    }
    
    throw error;
  }
};