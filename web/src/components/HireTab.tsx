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
  const [playerNotes, setPlayerNotes] = useState<{[key: string]: string}>({});
  const [loadingGrades, setLoadingGrades] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [additionalInfo, setAdditionalInfo] = useState<string>("");
  const [isHiring, setIsHiring] = useState<boolean>(false); // Add missing state
  const { showNotification } = useNotification();

  const fetchPlayerNotes = async (players: NearbyPlayer[]) => {
    const job = getFallbackJob();
    
    for (const player of players) {
      try {
        const noteResponse = await fetchWithFallback<{success: boolean; note: string}>(
          'getEmployeeNote',
          {
            job: job,
            identifier: player.id
          },
          false
        );
        
        if (noteResponse.success && noteResponse.note) {
          setPlayerNotes(prev => ({
            ...prev,
            [player.id]: noteResponse.note
          }));
        }
      } catch (err) {
        console.error('Error fetching note for player:', player.id, err);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const job = getFallbackJob();
        
        const playersData = await fetchWithFallback<NearbyPlayer[]>(
          'getNearbyPlayers', 
          { job },
          true
        );
        
        if (Array.isArray(playersData)) {
          setNearbyPlayers(playersData);
          fetchPlayerNotes(playersData);
        }
        
        setNearbyPlayers(Array.isArray(playersData) ? playersData : []);
        
        setLoadingGrades(true);
        const ranks = await fetchWithFallback<JobGrade[]>(
          'getRanks', 
          { job },
          true 
        );
        
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
    
    if (isHiring) {
      return; 
    }
    
    try {
      setIsHiring(true);
      
      const selectedGrade = jobGrades.find(grade => grade.name === selectedPosition);
      if (!selectedGrade) {
        showNotification('error', 'Vybraná pozice není platná');
        return;
      }
      
      const playerId = parseInt(selectedPlayer, 10);
      if (isNaN(playerId)) {
        showNotification('error', 'Neplatné ID hráče');
        return;
      }
      
      console.log('[DEBUG] Hiring employee:', playerId, 'for position:', selectedPosition, 'grade:', selectedGrade.grade);
      
      const job = getFallbackJob();
      
      console.log('[DEBUG] Hiring data:', {
        player: playerId,
        job: job,
        position: selectedGrade.grade
      });
      
      const result = await fetchWithFallback<{success: boolean; message?: string}>(
        'hireEmployee', 
        {
          player: playerId,
          job: job,
          position: selectedGrade.grade
        },
        false 
      );
      
      console.log('[DEBUG] Hire response:', result);
      
      if (result && result.success) {
        showNotification('success', 'Zaměstnanec byl úspěšně přijat');
        setSelectedPlayer("");
        setSelectedPosition("");
        setAdditionalInfo("");
      } else {
        const errorMessage = result?.message || 'Nepodařilo se přijmout zaměstnance';
        showNotification('error', errorMessage);
      }
    } catch (err) {
      console.error('[DEBUG] Error hiring employee:', err);
      showNotification('error', 'Nastala chyba při přijímání zaměstnance');
    } finally {
      setIsHiring(false);
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
          
          {/* Display notes if they exist for the selected player */}
          {selectedPlayer && playerNotes[selectedPlayer] && (
            <div className="player-note">
              <h4>Předchozí poznámka k tomuto hráči:</h4>
              <div className="note-content">{playerNotes[selectedPlayer]}</div>
            </div>
          )}
          
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
              disabled={!selectedPlayer || !selectedPosition || isHiring}
            >
              {isHiring ? "Zpracovávám..." : "Zaměstnat"}
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