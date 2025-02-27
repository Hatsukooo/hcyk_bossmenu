import React, { useState, useEffect } from 'react';
import { JobGrade, JobData } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';
import '../styles/FactionManagement.css';

// Define additional interfaces for faction settings
interface FactionSettings {
  logo?: string;
  color: string;
  description: string;
}

const FactionManagementTab: React.FC = () => {
  const { showNotification } = useNotification();
  const { showDialog } = useDialog();
  
  // State variables
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [ranks, setRanks] = useState<JobGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState<JobGrade | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    salary: 0
  });
  const [factionSettings, setFactionSettings] = useState<FactionSettings>({
    color: '#4a90e2',
    description: ''
  });
  const [initialJobLabel, setInitialJobLabel] = useState('');
  const [jobFormChanged, setJobFormChanged] = useState(false);

  // Fetch job data and ranks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const job = getFallbackJob();
        
        // Fetch job data
        const jobDataResponse = await fetchWithFallback<JobData>(
          'getJobData', 
          { job }, 
          true // Use mock data if fetch fails
        );
        
        if (!jobDataResponse) {
          setError('Nepodařilo se načíst data frakce');
          return;
        }
        
        setJobData(jobDataResponse);
        setInitialJobLabel(jobDataResponse.label || '');
        
        // Set faction settings with defaults or stored values
        setFactionSettings({
          color: jobDataResponse.color || '#4a90e2',
          description: jobDataResponse.description || ''
        });
        
        // Fetch ranks data
        const ranksData = await fetchWithFallback<JobGrade[]>(
          'getRanks', 
          { job }, 
          true // Use mock data if fetch fails
        );
        
        if (!ranksData || ranksData.length === 0) {
          setError('Žádné hodnosti nenalezeny');
        } else {
          setRanks(ranksData);
        }
      } catch (err) {
        console.error('Chyba při načítání dat frakce:', err);
        setError('Chyba při načítání dat frakce');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Event handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'salary' ? parseInt(value) || 0 : value
    });
  };
  
  const handleFactionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFactionSettings({
        ...factionSettings,
        [name]: target.checked
      });
    } else {
      setFactionSettings({
        ...factionSettings,
        [name]: value
      });
    }
    
    setJobFormChanged(true);
  };
  
  const handleJobNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!jobData) return;
    
    setJobData({
      ...jobData,
      label: e.target.value
    });
    
    setJobFormChanged(true);
  };

  // Open edit rank modal
  const handleEditRank = (rank: JobGrade) => {
    setSelectedRank(rank);
    setFormData({
      name: rank.name,
      label: rank.label,
      salary: rank.salary
    });
    setShowEditModal(true);
  };

  // Create new rank modal
  const handleCreateRank = () => {
    setFormData({
      name: '',
      label: '',
      salary: 0
    });
    setShowCreateModal(true);
  };

  // Save rank edit
  const handleSaveEdit = async () => {
    if (!selectedRank) return;

    try {
      const response = await fetchWithFallback<{success: boolean; message?: string}>(
        'updateRank', 
        {
          job: getFallbackJob(),
          grade: selectedRank.grade,
          data: formData
        }
      );
      
      if (response.success) {
        // Update local state
        setRanks(prev => prev.map(r => 
          r.grade === selectedRank.grade 
            ? { ...r, name: formData.name, label: formData.label, salary: formData.salary } 
            : r
        ));
        
        showNotification('success', 'Hodnost úspěšně upravena');
        setShowEditModal(false);
      } else {
        showNotification('error', response.message || 'Nepodařilo se upravit hodnost');
      }
    } catch (err) {
      console.error('Chyba při úpravě hodnosti:', err);
      showNotification('error', 'Nastala chyba při úpravě hodnosti');
    }
  };

  // Create new rank
  const handleCreateNewRank = async () => {
    try {
      const response = await fetchWithFallback<{success: boolean; message?: string}>(
        'createRank', 
        {
          job: getFallbackJob(),
          data: formData
        }
      );
      
      if (response.success) {
        // Reload ranks
        try {
          const job = getFallbackJob();
          const ranks = await fetchWithFallback<JobGrade[]>('getRanks', { job }, true);
          setRanks(ranks);
          
          showNotification('success', 'Hodnost úspěšně vytvořena');
          setShowCreateModal(false);
        } catch (err) {
          console.error('Chyba při načítání hodností po vytvoření:', err);
          showNotification('warning', 'Hodnost vytvořena, ale nelze aktualizovat seznam');
        }
      } else {
        showNotification('error', response.message || 'Nepodařilo se vytvořit hodnost');
      }
    } catch (err) {
      console.error('Chyba při vytváření hodnosti:', err);
      showNotification('error', 'Nastala chyba při vytváření hodnosti');
    }
  };

  // Delete rank
  const handleDeleteRank = async () => {
    if (!selectedRank) return;

    showDialog({
      title: 'Potvrdit smazání',
      message: `Opravdu chcete smazat hodnost "${selectedRank.label}"?`,
      confirmText: 'Smazat',
      cancelText: 'Zrušit',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithFallback<{success: boolean; message?: string}>(
            'deleteRank', 
            {
              job: getFallbackJob(),
              grade: selectedRank.grade
            }
          );
          
          if (response.success) {
            // Update local state
            setRanks(prev => prev.filter(r => r.grade !== selectedRank.grade));
            
            showNotification('success', 'Hodnost úspěšně smazána');
            setShowEditModal(false);
          } else {
            showNotification('error', response.message || 'Nepodařilo se smazat hodnost');
          }
        } catch (err) {
          console.error('Chyba při mazání hodnosti:', err);
          showNotification('error', 'Nastala chyba při mazání hodnosti');
        }
      }
    });
  };
  
  // Save faction settings
  const handleSaveFactionSettings = async () => {
    if (!jobData) return;
    
    try {
      const response = await fetchWithFallback<{success: boolean; message?: string}>(
        'updateJobSettings', 
        {
          job: getFallbackJob(),
          data: {
            label: jobData.label,
            settings: {
              ...factionSettings,
              // Include empty values for removed fields to maintain API compatibility
              maxMembers: 50,
              hideFromPublic: false
            }
          }
        }
      );
      
      if (response.success) {
        showNotification('success', 'Nastavení frakce bylo úspěšně uloženo');
        setJobFormChanged(false);
      } else {
        showNotification('error', response.message || 'Nepodařilo se uložit nastavení frakce');
      }
    } catch (err) {
      console.error('Chyba při ukládání nastavení frakce:', err);
      showNotification('error', 'Nastala chyba při ukládání nastavení frakce');
    }
  };

  // Loading and error states
  if (loading) return <div>Načítání dat frakce...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Správa frakce</h2>
      
      <div className="faction-management-tabs">
        <div className="tab-navigation">
          <button 
            className={activeTab === 'general' ? 'active-tab' : ''}
            onClick={() => setActiveTab('general')}
          >
            Obecné nastavení
          </button>
          <button 
            className={activeTab === 'ranks' ? 'active-tab' : ''}
            onClick={() => setActiveTab('ranks')}
          >
            Hodnosti
          </button>
        </div>
        
        <div className="tab-panel">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="general-settings">
              <div className="faction-info-form">
                <div className="form-group">
                  <label>Název frakce:</label>
                  <input 
                    type="text" 
                    value={jobData?.label || ''}
                    onChange={handleJobNameChange}
                    placeholder="Zadejte zobrazovaný název frakce"
                  />
                  <span className="form-help">Název, který se zobrazuje hráčům</span>
                </div>
                
                <div className="form-group">
                  <label>Popis frakce:</label>
                  <textarea
                    name="description"
                    value={factionSettings.description}
                    onChange={handleFactionInputChange}
                    placeholder="Zadejte popis frakce..."
                    rows={4}
                  />
                  <span className="form-help">Popis činnosti a zaměření frakce</span>
                </div>
                

                
                {jobFormChanged && (
                  <div className="form-actions">
                    <button 
                      className="action-btn" 
                      onClick={handleSaveFactionSettings}
                    >
                      Uložit změny
                    </button>
                    <button 
                      className="cancel-btn"
                      onClick={() => {
                        // Reset to initial values
                        if (jobData) {
                          setJobData({
                            ...jobData,
                            label: initialJobLabel
                          });
                        }
                        setJobFormChanged(false);
                      }}
                    >
                      Zrušit změny
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Ranks Management Tab */}
          {activeTab === 'ranks' && (
            <div className="ranks-management">
              <div className="ranks-container">
                <div className="ranks-header">
                  <div className="rank-level">Úroveň</div>
                  <div className="rank-name">Kód hodnosti</div>
                  <div className="rank-label">Název hodnosti</div>
                  <div className="rank-salary">Plat</div>
                  <div className="rank-actions">Akce</div>
                </div>
                
                {ranks.map(rank => (
                  <div key={rank.grade} className="rank-item">
                    <div className="rank-level">{rank.grade}</div>
                    <div className="rank-name">{rank.name}</div>
                    <div className="rank-label">{rank.label}</div>
                    <div className="rank-salary">${rank.salary}</div>
                    <div className="rank-actions">
                      <button onClick={() => handleEditRank(rank)} className="action-btn">Upravit</button>
                    </div>
                  </div>
                ))}
                
                <div className="add-rank">
                  <button className="add-btn" onClick={handleCreateRank}>
                    <span className="plus-icon">+</span> Přidat hodnost
                  </button>
                </div>
              </div>
            </div>
          )}
          

        </div>
      </div>
      
      {/* Modal for editing rank */}
      {showEditModal && selectedRank && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <button className="close-btn" onClick={() => setShowEditModal(false)}>X</button>
            <h3>Upravit hodnost</h3>
            
            <div className="form-group">
              <label>Úroveň:</label>
              <input type="text" value={selectedRank.grade} disabled className="disabled-input" />
            </div>
            
            <div className="form-group">
              <label>Kód hodnosti:</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="např. boss, employee"
              />
            </div>
            
            <div className="form-group">
              <label>Název hodnosti:</label>
              <input 
                type="text" 
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                placeholder="např. Šéf, Zaměstnanec"
              />
            </div>
            
            <div className="form-group">
              <label>Plat:</label>
              <input 
                type="number" 
                name="salary"
                value={formData.salary}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={handleSaveEdit} className="action-btn">Uložit změny</button>
              <button onClick={handleDeleteRank} className="danger-btn">Smazat hodnost</button>
              <button onClick={() => setShowEditModal(false)} className="cancel-btn">Zrušit</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for creating rank */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <button className="close-btn" onClick={() => setShowCreateModal(false)}>X</button>
            <h3>Vytvořit novou hodnost</h3>
            
            <div className="form-group">
              <label>Kód hodnosti:</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="např. supervisor, trainee"
              />
            </div>
            
            <div className="form-group">
              <label>Název hodnosti:</label>
              <input 
                type="text" 
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                placeholder="např. Supervizor, Učeň"
              />
            </div>
            
            <div className="form-group">
              <label>Plat:</label>
              <input 
                type="number" 
                name="salary"
                value={formData.salary}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={handleCreateNewRank} className="action-btn">Vytvořit hodnost</button>
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">Zrušit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default FactionManagementTab;