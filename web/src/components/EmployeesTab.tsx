import React, { useState, useEffect, useCallback } from 'react';
import { Employee, EmployeeHistory, EmployeeBackend } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';

// Mock data histories (will be replaced with real data when available)
const employeeHistory: EmployeeHistory = {
  1: [
    { date: '15.1.2025', type: 'Prémie', amount: '+$200', note: 'Splnění kvartálního cíle' },
    { date: '12.12.2024', type: 'Povýšení', amount: '+$300', note: 'Povýšení na senior pozici' },
    { date: '5.11.2024', type: 'Prémie', amount: '+$150', note: 'Výborný výkon v říjnu' }
  ],
  2: [
    { date: '10.1.2025', type: 'Prémie', amount: '+$100', note: 'Přesčasy během Vánoc' },
    { date: '25.10.2024', type: 'Prémie', amount: '+$50', note: 'Pomoc novým zaměstnancům' }
  ],
  3: [
    { date: '5.1.2025', type: 'Srážka', amount: '-$50', note: 'Pozdní příchody' },
    { date: '15.12.2024', type: 'Prémie', amount: '+$75', note: 'Práce o víkendu' },
    { date: '10.11.2024', type: 'Prémie', amount: '+$125', note: 'Řešení krizové situace' }
  ]
};

const EmployeesTab: React.FC = () => {
  // States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>("historie");
  const [formChanged, setFormChanged] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    role: '',
    salary: 0,
    note: ''
  });
  const { showNotification } = useNotification();
  const { showDialog } = useDialog();

  // Fetch employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const job = getFallbackJob();
        
        // Fetch basic employee data
        const data = await fetchWithFallback<EmployeeBackend[]>(
          'getEmployees', 
          { job }, 
          true // Use mock data if fetch fails
        );
       
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
          return;
        }
        
        // Fetch weekly playtime for all employees
        const playtimeData = await fetchWithFallback<{[key: string]: number}>(
          'hcyk_bossactions:getEmployeesPlaytime',
          { job },
          true // Use mock data if fetch fails
        );
        
        // Transform backend data to frontend Employee type
        const formattedEmployees: Employee[] = data.map(emp => {
          const identifier = emp.identifier.toString();
          const weeklyPlaytime = playtimeData && playtimeData[identifier] ? playtimeData[identifier] : 0;
          
          return {
            id: Number(identifier), 
            name: `${emp.firstname} ${emp.lastname}`,
            role: emp.grade_name,
            salary: emp.salary || 0,
            weeklyPlaytime: weeklyPlaytime,
            level: emp.grade
          };
        });
       
        setEmployees(formattedEmployees);
      } catch (err) {
        console.error('Chyba při načítání zaměstnanců:', err);
        setError('Chyba při načítání zaměstnanců');
      } finally {
        setLoading(false);
      }
    };
  
    fetchEmployees();
  }, []); 
  
  // When a employee is selected, set the form data
  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        role: selectedEmployee.role,
        salary: selectedEmployee.salary,
        note: employeeNotes[selectedEmployee.id.toString()] || ''
      });
      
      // Fetch the employee's note if we don't have it already
      if (!employeeNotes[selectedEmployee.id.toString()]) {
        fetchEmployeeNote(selectedEmployee.id.toString());
      }
    }
  }, [selectedEmployee, employeeNotes]);
  
  // Function to fetch employee notes
  const fetchEmployeeNote = async (employeeId: string) => {
    try {
      const response = await fetchWithFallback<{success: boolean; note: string}>(
        'hcyk_bossactions:getEmployeeNote',
        {
          job: getFallbackJob(),
          identifier: employeeId
        },
        true // Use mock data if fetch fails
      );
      
      if (response.success) {
        setEmployeeNotes(prev => ({
          ...prev,
          [employeeId]: response.note
        }));
      }
    } catch (err) {
      console.error('Error fetching employee note:', err);
    }
  };
  
  // Handler for form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? parseInt(value) || 0 : value
    }));
    setFormChanged(true);
  };
  
  // Handler for modal close with check for unsaved changes
  const handleCloseModal = () => {
    if (formChanged) {
      showDialog({
        title: 'Neuložené změny',
        message: 'Máte neuložené změny. Opravdu chcete zavřít?',
        type: 'warning',
        onConfirm: () => {
          // Reset form data to match the current employee data
          if (selectedEmployee) {
            setFormData({
              role: selectedEmployee.role,
              salary: selectedEmployee.salary,
              note: employeeNotes[selectedEmployee.id.toString()] || ''
            });
          }
          setFormChanged(false);
          setShowDetailModal(false);
        }
      });
    } else {
      setShowDetailModal(false);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!selectedEmployee) return;
  
    try {
      const noteResponse = await fetchWithFallback(
        'saveEmployeeNote', 
        {
          job: getFallbackJob(),
          identifier: selectedEmployee.id.toString(),
          note: formData.note
        }
      );
  
      if (!noteResponse.success) {
        showNotification('error', noteResponse.message || 'Nepodařilo se uložit poznámku');
        return;
      }
  
      const detailsResponse = await fetchWithFallback(
        'setEmployeeDetails', 
        {
          identifier: selectedEmployee.id,
          job: getFallbackJob(),
          level: selectedEmployee.level,
          salary: formData.salary
        }
      );
  
      if (detailsResponse.success) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? {...emp, role: formData.role, salary: formData.salary} 
            : emp
        ));
        
        setEmployeeNotes(prev => ({
          ...prev,
          [selectedEmployee.id.toString()]: formData.note
        }));
        
        setFormChanged(false);
        showNotification('success', 'Změny uloženy úspěšně');
      } else {
        showNotification('error', detailsResponse.message || 'Nepodařilo se uložit změny');
      }
    } catch (err) {
      console.error('Chyba při ukládání změn:', err);
      showNotification('error', 'Nastala chyba při ukládání změn');
    }
  };
  
  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setActiveTab("historie");
    setShowDetailModal(true);
  };
  
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  // Get unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(employees.map(emp => emp.role)));
  
  // Render loading state
  if (loading) return <div>Načítání zaměstnanců...</div>;

  // Render error state
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Zaměstnanci</h2>
      
      {/* Filtr a vyhledávání */}
      <div className="filter-controls">
        <input 
          type="text" 
          placeholder="Vyhledat zaměstnance..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Všechny pozice</option>
          {uniqueRoles.map((role, index) => (
            <option key={index} value={role}>{role}</option>
          ))}
        </select>
      </div>
      
      <div className="employees-list">
        {filteredEmployees.map(emp => (
          <div key={emp.id} className="employee-card">
            <div className="employee-info">
              <div className="employee-header">
                <h3>{emp.name}</h3>
                <div className="playtime-indicator">
                  {emp.weeklyPlaytime || 0} hodin
                </div>
              </div>
              <p>Pozice: {emp.role}</p>
              <p>Plat: ${emp.salary}</p>
            </div>
            <div className="employee-actions">
              <button onClick={() => handleOpenDetail(emp)} className="action-btn">Upravit</button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modální okno s detaily zaměstnance */}
      {showDetailModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="employee-detail-modal">
            <button className="close-btn" onClick={handleCloseModal}>X</button>
            <h3 className="modal-title">Detail zaměstnance - {selectedEmployee.name}</h3>
            
            <div className="employee-detail">
              <div className="detail-header">
                <div className="detail-info">
                  <h2>{selectedEmployee.name}</h2>
                  <div className="detail-stats">
                    <div className="detail-stat">
                      <span className="stat-label">Pozice:</span>
                      <span className="stat-value">{selectedEmployee.role}</span>
                    </div>
                    <div className="detail-stat">
                      <span className="stat-label">Plat:</span>
                      <span className="stat-value">${selectedEmployee.salary}</span>
                    </div>
                    <div className="detail-stat">
                      <span className="stat-label">Odehraný čas za týden:</span>
                      <span className="stat-value">{selectedEmployee.weeklyPlaytime || 0} hodin</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="detail-tabs">
                <div className="detail-tab-header">
                  <button 
                    className={`tab-button ${activeTab === "historie" ? "active" : ""}`}
                    onClick={() => setActiveTab("historie")}
                  >
                    Historie odměn
                  </button>
                  <button 
                    className={`tab-button ${activeTab === "poznamky" ? "active" : ""}`}
                    onClick={() => setActiveTab("poznamky")}
                  >
                    Poznámky
                  </button>
                </div>
                
                <div className="detail-tab-content">
                  {activeTab === "historie" && (
                    <div className="history-list">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>Datum</th>
                            <th>Typ</th>
                            <th>Částka</th>
                            <th>Poznámka</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeHistory[selectedEmployee.id]?.map((item, index) => (
                            <tr key={index}>
                              <td>{item.date}</td>
                              <td>
                                <span className={`history-type ${item.type.toLowerCase()}`}>{item.type}</span>
                              </td>
                              <td className={item.amount.startsWith('+') ? 'positive' : 'negative'}>
                                {item.amount}
                              </td>
                              <td>{item.note}</td>
                            </tr>
                          ))}
                          {!employeeHistory[selectedEmployee.id] && (
                            <tr>
                              <td colSpan={4} className="no-data">Žádná historie nenalezena</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {activeTab === "poznamky" && (
                    <div className="notes-content">
                      <div className="form-group">
                        <textarea 
                          name="note"
                          value={formData.note}
                          onChange={handleFormChange}
                          placeholder="Přidat poznámku..."
                        ></textarea>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="employee-edit-form">
                <h4>Úprava zaměstnance</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Jméno</label>
                    <input 
                      type="text" 
                      value={selectedEmployee.name}
                      disabled={true}
                      className="disabled-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pozice</label>
                    <select 
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                    >
                      {uniqueRoles.map((role, index) => (
                        <option key={index} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Plat</label>
                    <input 
                      type="number" 
                      name="salary"
                      value={formData.salary}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                
                {formChanged && (
                  <div className="form-save-actions">
                    <button className="action-btn" onClick={handleSaveChanges}>Uložit změny</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesTab;