import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';

// Definice typů
interface NearbyPlayer {
  id: number;
  name: string;
}

interface JobGrade {
  grade: number;
  name: string;
  label: string;
  salary: number;
}

const HireTab: React.FC = () => {
  // State
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [jobGrades, setJobGrades] = useState<JobGrade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingGrades, setLoadingGrades] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const { showNotification } = useNotification();

  const safelyFetchData = async <T,>(
    endpoint: string,
    data: any,
    defaultValue: T
  ): Promise<T> => {
    try {
      const response = await fetch(`https://hcyk_bossmenu/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // For empty responses, return the default value
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn(`[DEBUG] Empty response from ${endpoint}`);
        return defaultValue;
      }

      // Safely parse JSON
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        console.error(`[DEBUG] JSON parse error for ${endpoint}:`, e);
        console.error(`[DEBUG] Attempted to parse:`, text);
        return defaultValue;
      }
    } catch (error) {
      console.warn(`[DEBUG] Error fetching ${endpoint}:`, error);
      return defaultValue;
    }
  };

  // Fetch nearby players when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const job = getFallbackJob();
        
        // Fetch nearby players using fetchWithFallback
        const playersData = await fetchWithFallback<NearbyPlayer[]>(
          'getNearbyPlayers', 
          { job },
          true // Use mock data if fetch fails
        );
        
        setNearbyPlayers(Array.isArray(playersData) ? playersData : []);
        
        // Fetch job grades (ranks)
        setLoadingGrades(true);
        const ranks = await fetchWithFallback<JobGrade[]>(
          'getRanks', 
          { job },
          true // Use mock data if fetch fails
        );
        
        // Sort ranks by grade
        const sortedRanks = Array.isArray(ranks) 
          ? ranks.sort((a, b) => a.grade - b.grade)
          : [];
          
        setJobGrades(sortedRanks);
      } catch (err) {
        console.error('Chyba při načítání dat:', err);
        setError('Chyba při komunikaci se serverem');
      } finally {
        setLoading(false);
        setLoadingGrades(false);
      }
    };

    fetchData();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlayer || !selectedPosition) {
      showNotification('error', 'Vyberte hráče a pozici');
      return;
    }
    
    try {
      console.log('[DEBUG] Hiring employee:', selectedPlayer, 'for position:', selectedPosition);
      
      const selectedGrade = jobGrades.find(grade => grade.name === selectedPosition);
      if (!selectedGrade) {
        showNotification('error', 'Vybraná pozice není platná');
        return;
      }
      
      const playerId = parseInt(selectedPlayer, 10);
      
      const result = await safelyFetchData<{success: boolean; message?: string}>(
        'hireEmployee',
        {
          player: playerId, 
          job: getFallbackJob(),
          position: selectedGrade.grade,
          additionalInfo,
          salary: selectedGrade.salary
        },
        { success: false, message: 'Failed to receive response from server' }
      );
      
      console.log('[DEBUG] Hire response:', result);
      
      if (result.success) {
        showNotification('success', 'Zaměstnanec byl úspěšně přijat');
        setSelectedPlayer("");
        setSelectedPosition("");
        setAdditionalInfo("");
      } else {
        showNotification('error', result.message || 'Nepodařilo se přijmout zaměstnance');
      }
    } catch (err) {
      console.error('[DEBUG] Error hiring employee:', err);
      showNotification('error', 'Nastala chyba při přijímání zaměstnance');
    }
  };
  
  const getCurrentSalary = () => {
    const position = jobGrades.find(grade => grade.name === selectedPosition);
    return position ? position.salary : 0;
  };
  
  if (loading && loadingGrades) return <div>Načítání dat...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Zaměstnat</h2>
      
      <div className="hire-form-container">
        <form onSubmit={handleSubmit} className="hire-form">
          <div className="form-group">
            <label htmlFor="player">Vyberte hráče:</label>
            <select 
              id="player"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              required
            >
              <option value="">-- Vyberte hráče --</option>
              {nearbyPlayers.length > 0 ? (
                nearbyPlayers.map(player => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))
              ) : (
                <option value="" disabled>Žádní hráči v okolí</option>
              )}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="position">Vyberte pozici:</label>
            <select 
              id="position"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              required
              disabled={loadingGrades}
            >
              <option value="">-- Vyberte pozici --</option>
              {jobGrades.length > 0 ? (
                jobGrades.map(grade => (
                  <option key={grade.grade} value={grade.name}>
                    {grade.label} - ${grade.salary}
                  </option>
                ))
              ) : (
                <option value="" disabled>Žádné pozice nenalezeny</option>
              )}
            </select>
          </div>
          
          {selectedPosition && (
            <div className="salary-preview">
              <p>Celkový plat: <span className="salary-amount">${getCurrentSalary()}</span></p>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="additional">Dodatečné informace:</label>
            <textarea 
              id="additional"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Discord ID, poznámky..."
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="action-btn"
              disabled={!selectedPlayer || !selectedPosition}
            >
              Zaměstnat
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => {
                setSelectedPlayer("");
                setSelectedPosition("");
                setAdditionalInfo("");
              }}
            >
              Resetovat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HireTab;