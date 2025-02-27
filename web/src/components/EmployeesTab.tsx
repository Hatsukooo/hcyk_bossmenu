import React, { useState, useEffect } from 'react';
import { Employee, EmployeeHistory, EmployeeActivities, EmployeeBackend } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';
import PlaytimeChart from './charts/PlaytimeChart';

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

const employeeActivities: EmployeeActivities = {
  1: [
    { date: '25.1.2025', activity: 'Přítomen', hours: 8 },
    { date: '24.1.2025', activity: 'Přítomen', hours: 9 },
    { date: '23.1.2025', activity: 'Přítomen', hours: 8 },
    { date: '22.1.2025', activity: 'Přítomen', hours: 8 },
    { date: '21.1.2025', activity: 'Nemoc', hours: 0 }
  ],
  2: [
    { date: '25.1.2025', activity: 'Přítomen', hours: 7 },
    { date: '24.1.2025', activity: 'Přítomen', hours: 8 },
    { date: '23.1.2025', activity: 'Dovolená', hours: 0 },
    { date: '22.1.2025', activity: 'Dovolená', hours: 0 },
    { date: '21.1.2025', activity: 'Přítomen', hours: 8 }
  ],
  3: [
    { date: '25.1.2025', activity: 'Přítomen', hours: 6 },
    { date: '24.1.2025', activity: 'Přítomen', hours: 7 },
    { date: '23.1.2025', activity: 'Přítomen', hours: 6 },
    { date: '22.1.2025', activity: 'Přítomen', hours: 8 },
    { date: '21.1.2025', activity: 'Přítomen', hours: 7 }
  ]
};

const EmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>("historie");
  const [formChanged, setFormChanged] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: '',
    salary: 0,
    note: ''
  });
  const { showNotification } = useNotification();
  const { showDialog } = useDialog();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const job = getFallbackJob();
        const data = await fetchWithFallback<EmployeeBackend[]>(
          'getEmployees', 
          { job }, 
          true 
        );
       
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
          return;
        }
       
        const formattedEmployees: Employee[] = data.map(emp => ({
          id: Number(emp.identifier), 
          name: `${emp.firstname} ${emp.lastname}`,
          role: emp.grade_name,
          salary: emp.salary || 0,
          performance: emp.performance || 75,
          level: emp.grade
        }));
       
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
  
  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        role: selectedEmployee.role,
        salary: selectedEmployee.salary,
        note: '' 
      });
    }
  }, [selectedEmployee]);
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? parseInt(value) || 0 : value
    }));
    setFormChanged(true);
  };
  
  const handleCloseModal = () => {
    if (formChanged) {
      showDialog({
        title: 'Neuložené změny',
        message: 'Máte neuložené změny. Opravdu chcete zavřít?',
        type: 'warning',
        onConfirm: () => {
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
      const response = await fetchWithFallback(
        'setEmployeeDetails', 
        {
          identifier: selectedEmployee.id,
          job: getFallbackJob(),
          role: formData.role,
          salary: formData.salary,
          note: formData.note
        }
      );

      if (response.success) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id 
            ? {...emp, role: formData.role, salary: formData.salary} 
            : emp
        ));
        
        setFormChanged(false);
        showNotification('success', 'Změny uloženy úspěšně');
      } else {
        showNotification('error', response.message || 'Nepodařilo se uložit změny');
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
  
  const uniqueRoles = Array.from(new Set(employees.map(emp => emp.role)));
  
  if (loading) return <div>Načítání zaměstnanců...</div>;

  if (error) return <div className="error-message">{error}</div>;

  const getHoursFromPerformance = (performance: number): number => {
    const estimatedHours = ((performance / 0.57) * 2).toFixed(1);
    return parseFloat(estimatedHours);
  };
  
  return (
    <div className="tab-content">
      <h2>Zaměstnanci</h2>
      
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
                <div className="performance-indicator" 
                    title={`Výkon založen na týdenním odehraném čase (${getHoursFromPerformance(emp.performance)} hodin)`}
                    style={{backgroundColor: emp.performance > 80 ? '#4cd964' : 
                                             emp.performance > 60 ? '#ffcc00' : '#ff3b30'}}>
                    {emp.performance}%
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
                      <span className="stat-label">Výkon:</span>
                      <span className="stat-value performance" 
                            style={{color: selectedEmployee.performance > 80 ? '#4cd964' : 
                                          selectedEmployee.performance > 60 ? '#ffcc00' : '#ff3b30'}}>
                        {selectedEmployee.performance}%
                      </span>
                      <span className="stat-detail">~{getHoursFromPerformance(selectedEmployee.performance)} hodin týdně</span>
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
                    className={`tab-button ${activeTab === "aktivita" ? "active" : ""}`}
                    onClick={() => setActiveTab("aktivita")}
                  >
                    Aktivita
                  </button>
                  <button 
                      className={`tab-button ${activeTab === "playtime" ? "active" : ""}`}
                      onClick={() => setActiveTab("playtime")}
                  >
                    Odehraný čas
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
                  
                  {activeTab === "aktivita" && (
                    <div className="activity-content">
                      <h4>Poslední aktivita</h4>
                      <div className="activity-chart">
                        {employeeActivities[selectedEmployee.id]?.map((activity, index) => (
                          <div className="activity-day" key={index} title={`${activity.date} - ${activity.hours} hodin na serveru`}>
                            <div className="activity-bar-container">
                              <div 
                                className={`activity-bar ${activity.activity.toLowerCase()}`} 
                                style={{height: `${(activity.hours / 8) * 100}%`}}
                              ></div>
                            </div>
                            <div className="activity-date">{activity.date.split('.')[0]}.</div>
                          </div>
                        ))}
                        {!employeeActivities[selectedEmployee.id] && (
                          <div className="no-data">Žádná aktivita nenalezena</div>
                        )}
                      </div>
                      <div className="activity-legend">
                        <div className="legend-item">
                          <span className="legend-color pritomen"></span>
                          <span>Přítomen</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-color dovolena"></span>
                          <span>Dovolená</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-color nemoc"></span>
                          <span>Nemoc</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "playtime" && (
                    <div className="playtime-content">
                      <div className="playtime-overview">
                        <h4>Analýza odehraného času</h4>
                        <p>Výkon zaměstnance ({selectedEmployee.performance}%) je vypočítán z týdenního odehraného času.</p>
                                    
                        <div className="performance-explanation">
                          <div className="performance-scale">
                            <div className="scale-segment bad">
                              <span>0-60%</span>
                            </div>
                            <div className="scale-segment average">
                              <span>61-80%</span>
                            </div>
                            <div className="scale-segment good">
                              <span>81-100%</span>
                            </div>
                          </div>
                          <div className="performance-hours">
                            <span>0h</span>
                            <span>20h</span>
                            <span>35h+</span>
                          </div>
                          <p className="scale-info">Hodnocení je určeno na základě přibližně 35 hodin týdně (100%).</p>
                        </div>
                                    
                        <PlaytimeChart employeeId={selectedEmployee.id.toString()} />
                      </div>
                    </div>
                  )}
                  {activeTab === "poznamky" && (
                    <div className="notes-content">
                      <p>Zde budou zobrazeny poznámky a další informace o zaměstnanci...</p>
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
                <div className="form-group">
                  <label>Poznámka</label>
                  <textarea 
                    name="note"
                    value={formData.note}
                    onChange={handleFormChange}
                    placeholder="Přidat poznámku..."
                  ></textarea>
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