import React, { useState, useEffect } from 'react';
import { JobGrade } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';

const RanksManagementTab: React.FC = () => {
  const { showNotification } = useNotification();
  const { showDialog } = useDialog();
  
  const [ranks, setRanks] = useState<JobGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState<JobGrade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    salary: 0
  });

  // Načíst hodnosti
  useEffect(() => {
    const fetchRanks = async () => {
      try {
        setLoading(true);
        setError(null);

        const job = getFallbackJob();
        const data = await fetchWithFallback<JobGrade[]>(
          'getRanks', 
          { job }, 
          true // Use mock data if fetch fails
        );
        
        if (!data || data.length === 0) {
          setError('Žádné hodnosti nenalezeny');
        } else {
          setRanks(data);
        }
      } catch (err) {
        console.error('Chyba při načítání hodností:', err);
        setError('Chyba při načítání hodností');
      } finally {
        setLoading(false);
      }
    };

    fetchRanks();
  }, []);

  // Správa formuláře
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'salary' ? parseInt(value) || 0 : value
    });
  };

  // Otevřít modal pro úpravu
  const handleEditRank = (rank: JobGrade) => {
    setSelectedRank(rank);
    setFormData({
      name: rank.name,
      label: rank.label,
      salary: rank.salary
    });
    setShowEditModal(true);
  };

  // Otevřít modal pro vytvoření
  const handleCreateRank = () => {
    setFormData({
      name: '',
      label: '',
      salary: 0
    });
    setShowCreateModal(true);
  };

  // Uložit úpravy
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
        // Aktualizovat lokální stav
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

  // Vytvořit novou hodnost
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
        // Znovu načíst hodnosti
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

  // Smazat hodnost
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
            // Aktualizovat lokální stav
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

  if (loading) return <div>Načítání hodností...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Správa hodností</h2>
      
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
      
      {/* Modal pro úpravu hodnosti */}
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
      
      {/* Modal pro vytvoření hodnosti */}
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

export default RanksManagementTab;