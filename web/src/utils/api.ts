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
          { identifier: '1', firstname: 'John', lastname: 'Doe', grade: 3, grade_name: 'boss', salary: 5000 },
          { identifier: '2', firstname: 'Jane', lastname: 'Smith', grade: 2, grade_name: 'deputy', salary: 4000 },
          { identifier: '3', firstname: 'Mike', lastname: 'Johnson', grade: 1, grade_name: 'officer', salary: 3000 }
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
      return await fetchNUI<T>(endpoint, data);
    } catch (error) {
      console.warn(`Error fetching ${endpoint}, ${useMock ? 'using mock data' : 'throwing error'}:`, error);
      
      if (useMock) {
        console.info(`Using mock data for ${endpoint}`);
        return getMockData(endpoint, data) as T;
      }
      
      throw error;
    }
  };