import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';
import { safelyExtractEmployeeId, convertEmployeeData, Employee, RawEmployee } from '../utils/employee-data-fix';

interface HistoryItem {
  date: string;
  type: string;
  amount: string;
  note: string;
}

interface EmployeeHistory {
  [key: number]: HistoryItem[];
}

// Mock history data
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
  // State
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
  const [allJobGrades, setAllJobGrades] = useState<any[]>([]);
  const [uniqueRoles, setUniqueRoles] = useState<string[]>([]);
  
  const pendingNoteRequests = useRef<string[]>([]);

  const { showNotification } = useNotification();
  const { showDialog } = useDialog();

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

      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn(`[DEBUG] Empty response from ${endpoint}`);
        return defaultValue;
      }

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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const job = getFallbackJob();
        console.log('[DEBUG] fetchEmployees - job name:', job);
        
        if (!job) {
          console.error('[DEBUG] No job found, cannot fetch employees');
          setError('Nelze načíst zaměstnance: Chybí název frakce');
          setLoading(false);
          return;
        }
        
        const requestData = { 
          job: job,
          job_name: job
        };
        
        console.log('[DEBUG] Sending employee request with data:', JSON.stringify(requestData));
        
        const data = await fetchWithFallback<RawEmployee[]>(
          'getEmployees', 
          requestData, 
          true 
        );
        console.log('[DEBUG] Raw employee data received:', JSON.stringify(data));
       
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
          return;
        }
        
        const playtimeData = await fetchWithFallback<{[key: string]: number}>(
          'hcyk_bossactions:getEmployeesPlaytime',
          { job },
          true
        );
        
        console.log('[DEBUG] Playtime data received:', JSON.stringify(playtimeData));
        
        const formattedEmployees = data.map(emp => {
          console.log('[DEBUG] Converting employee:', JSON.stringify(emp));
          const convertedEmp = convertEmployeeData(emp);
          const identifier = safelyExtractEmployeeId(emp);
          console.log('[DEBUG] Extracted identifier:', identifier);
          const weeklyPlaytime = playtimeData && identifier && playtimeData[String(identifier)] 
            ? playtimeData[String(identifier)] 
            : 0;
          
          return {
            ...convertedEmp,
            weeklyPlaytime
          };
        });
        
        console.log('[DEBUG] Formatted employees:', JSON.stringify(formattedEmployees));
        setEmployees(formattedEmployees);
      } catch (err) {
        console.error('[DEBUG] Error fetching employees:', err);
        setError('Chyba při načítání zaměstnanců');
      } finally {
        setLoading(false);
      }
    };
  
    fetchEmployees();
  }, []); 
  
  useEffect(() => {
    setUniqueRoles(Array.from(new Set(employees.map(emp => emp.role))));
    
    const fetchJobGrades = async () => {
      try {
        const job = getFallbackJob();
        console.log('[DEBUG] Fetching job grades for job:', job);
        
        const gradesData = await fetchWithFallback<any[]>(
          'getRanks', 
          { job },
          true
        );
        
        if (gradesData && gradesData.length > 0) {
          console.log('[DEBUG] Retrieved job grades:', gradesData);
          setAllJobGrades(gradesData);
        } else {
          console.log('[DEBUG] No job grades found');
        }
      } catch (err) {
        console.error('[DEBUG] Error fetching job grades:', err);
      }
    };
    
    fetchJobGrades();
  }, [employees]);
  
  // Debug logging for roles
  useEffect(() => {
    console.log('[DEBUG] Available roles for filtering:', uniqueRoles);
    console.log('[DEBUG] All employees with roles:', employees.map(e => ({
      name: e.name, 
      role: e.role,
      raw_id: e.id,
      level: e.level
    })));
  }, [employees, uniqueRoles]);

  // Update form data when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      console.log('[DEBUG] Selected employee in useEffect:', JSON.stringify(selectedEmployee));
      
      const employeeId = safelyExtractEmployeeId(selectedEmployee);
      
      if (!employeeId) {
        console.error("[DEBUG] Invalid employee ID:", JSON.stringify(selectedEmployee));
        return;
      }
      
      const employeeIdString = String(employeeId);
      const job = getFallbackJob();
      const noteKey = `${employeeIdString}_${job}`;
      
      console.log("[DEBUG] Selected employee ID after processing:", employeeIdString, "job:", job);
      
      setFormData(prevData => {
        if (prevData.role !== selectedEmployee.role || 
            prevData.salary !== selectedEmployee.salary ||
            prevData.note !== (employeeNotes[noteKey] || '')) {
          return {
            role: selectedEmployee.role,
            salary: selectedEmployee.salary,
            note: employeeNotes[noteKey] || ''
          };
        }
        return prevData; 
      });
      
      if (employeeNotes[noteKey] === undefined) {
        console.log('[DEBUG] Note not found in state, fetching note for:', employeeIdString);
        fetchEmployeeNote(employeeIdString);
      } else {
        console.log('[DEBUG] Using cached note for employee:', employeeIdString, 'job:', job);
      }
    }
  }, [selectedEmployee]);
  
  
  useEffect(() => {
    if (selectedEmployee) {
      const employeeId = safelyExtractEmployeeId(selectedEmployee);
      const job = getFallbackJob();
      const noteKey = `${String(employeeId)}_${job}`;
      
      if (employeeId && employeeNotes[noteKey] !== undefined) {
        setFormData(prev => ({
          ...prev,
          role: selectedEmployee.role,
          salary: selectedEmployee.salary,
          note: employeeNotes[noteKey] || ''
        }));
      }
    }
  }, [selectedEmployee, employeeNotes]);
  
  const fetchEmployeeNote = async (employeeId: string) => {
    if (!employeeId || 
        employeeId === 'undefined' || 
        employeeId === 'null' || 
        employeeId === 'NaN' ||
        pendingNoteRequests.current.includes(employeeId)) {
      return;
    }
    
    pendingNoteRequests.current.push(employeeId);
    
    try {
      console.log('[DEBUG] Fetching employee note for:', employeeId);
      const job = getFallbackJob();
      
      const noteKey = `${employeeId}_${job}`;
      
      const response = await safelyFetchData<{success: boolean; note: string}>(
        'getEmployeeNote',
        {
          job: job,
          identifier: employeeId
        },
        { success: true, note: '' } 
      );
      
      console.log('[DEBUG] Employee note response:', JSON.stringify(response));
      
      setEmployeeNotes(prev => ({
        ...prev,
        [noteKey]: response.note || ''
      }));
    } catch (err) {
      console.error('[DEBUG] Error fetching employee note:', err);
    } finally {
      pendingNoteRequests.current = pendingNoteRequests.current.filter(id => id !== employeeId);
    }
  };
  
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
          if (selectedEmployee) {
            const employeeId = safelyExtractEmployeeId(selectedEmployee);
            setFormData({
              role: selectedEmployee.role,
              salary: selectedEmployee.salary,
              note: employeeNotes[String(employeeId)] || ''
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
    
    const employeeId = safelyExtractEmployeeId(selectedEmployee);
    
    if (!employeeId) {
      showNotification('error', 'Neplatný identifikátor zaměstnance');
      return;
    }
  
    try {
      const job = getFallbackJob();
      let hasChanges = false;
      let positionChanged = false;
      let noteChanged = false;
      let salaryChanged = false;
      
      const isRoleChanged = formData.role !== selectedEmployee.role;
      const isSalaryChanged = formData.salary !== selectedEmployee.salary;
      
      const noteKey = `${employeeId}_${job}`;
      const currentNote = employeeNotes[noteKey] || '';
      const isNoteChanged = formData.note !== currentNote;
      
      if (isNoteChanged) {
        noteChanged = true;
        const noteResponse = await fetchWithFallback<{success: boolean; message?: string}>(
          'saveEmployeeNote', 
          {
            job: job,
            identifier: employeeId,
            note: formData.note
          }
        );
    
        if (!noteResponse.success) {
          showNotification('error', noteResponse.message || 'Nepodařilo se uložit poznámku');
          return;
        }
        
        setEmployeeNotes(prev => ({
          ...prev,
          [noteKey]: formData.note
        }));
        
        hasChanges = true;
      }
      
      if (isRoleChanged) {
        let newLevel = selectedEmployee.level;
        const matchingGrade = allJobGrades.find(grade => grade.name === formData.role);
        if (matchingGrade) {
          newLevel = matchingGrade.grade;
          
          const gradeResponse = await fetchWithFallback<{success: boolean; message?: string; changed?: boolean}>(
            'setGrade', 
            {
              identifier: employeeId,
              job: job,
              level: newLevel
            }
          );
          
          if (!gradeResponse.success) {
            showNotification('error', gradeResponse.message || 'Nepodařilo se změnit pozici');
            return;
          }
          
          positionChanged = gradeResponse.changed === true;
          
          if (positionChanged) {
            setEmployees(prev => prev.map(emp => 
              safelyExtractEmployeeId(emp) === employeeId 
                ? { ...emp, role: formData.role, level: newLevel } 
                : emp
            ));
            
            hasChanges = true;
          }
        }
      }
      
      if (isSalaryChanged) {
        salaryChanged = true;
        
        const salaryResponse = await fetchWithFallback<{success: boolean; message?: string}>(
          'setSalary', 
          {
            job: job,
            level: selectedEmployee.level, 
            salary: formData.salary
          }
        );
        
        if (!salaryResponse.success) {
          showNotification('error', salaryResponse.message || 'Nepodařilo se změnit plat');
          return;
        }
        
        setEmployees(prev => prev.map(emp => 
          safelyExtractEmployeeId(emp) === employeeId 
            ? { ...emp, salary: formData.salary } 
            : emp
        ));
        
        hasChanges = true;
      }
      
      if (hasChanges) {
        setFormChanged(false);
        
        if (positionChanged) {
          showNotification('success', 'Pozice zaměstnance byla změněna');
        } else if (salaryChanged && !positionChanged) {
          showNotification('success', 'Plat zaměstnance byl změněn');
        } else if (noteChanged && !positionChanged && !salaryChanged) {
          showNotification('success', 'Poznámka byla uložena');
        } else {
          showNotification('success', 'Změny byly uloženy');
        }
      } else {
        setFormChanged(false);
      }
    } catch (err) {
      console.error('[DEBUG] Error saving changes:', err);
      showNotification('error', 'Nastala chyba při ukládání změn');
    }
  };
  
  const handleOpenDetail = (employee: Employee) => {
    console.log('[DEBUG] handleOpenDetail called with employee:', JSON.stringify(employee));
    
    if (!employee) {
      console.error('[DEBUG] Invalid employee data (null or undefined)');
      return;
    }
    
    try {
      const cleanEmployee = convertEmployeeData(employee);
      console.log('[DEBUG] Converted employee:', JSON.stringify(cleanEmployee));
      
      const employeeId = safelyExtractEmployeeId(cleanEmployee);
      if (!employeeId) {
        console.error('[DEBUG] Failed to extract valid employee ID');
        showNotification('error', 'Chyba: Neplatný identifikátor zaměstnance');
        return;
      }
      
      console.log('[DEBUG] Opening detail for employee ID:', employeeId);
      setSelectedEmployee(cleanEmployee);
      setActiveTab("historie");
      setShowDetailModal(true);
    } catch (err) {
      console.error('[DEBUG] Error in handleOpenDetail:', err);
      showNotification('error', 'Nastala chyba při otevírání detailu');
    }
  };
  
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  
  if (loading) return <div>Načítání zaměstnanců...</div>;

  if (error) return <div className="error-message">{error}</div>;

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
        {filteredEmployees.map(emp => {
          const empId = safelyExtractEmployeeId(emp);
          console.log('[DEBUG] Rendering employee card with ID:', empId);
          
          return (
            <div key={String(empId || Math.random())} className="employee-card">
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
                <button 
                  onClick={() => {
                    console.log('[DEBUG] Edit button clicked for employee:', JSON.stringify(emp));
                    handleOpenDetail(emp);
                  }} 
                  className="action-btn"
                >
                  Upravit
                </button>
              </div>
            </div>
          );
        })}
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
                          {employeeHistory[Number(safelyExtractEmployeeId(selectedEmployee))]?.map((item, index) => (
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
                          {!employeeHistory[Number(safelyExtractEmployeeId(selectedEmployee))] && (
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
                      {allJobGrades.length > 0 ? (
                        allJobGrades.map((grade) => (
                          <option key={grade.grade} value={grade.name}>{grade.label}</option>
                        ))
                      ) : (
                        uniqueRoles.map((role, index) => (
                          <option key={index} value={role}>{role}</option>
                        ))
                      )}
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