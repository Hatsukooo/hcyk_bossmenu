import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Employee, EmployeeBackend, convertBackendToEmployee } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';

const FireTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [severanceAmount, setSeveranceAmount] = useState<number>(0);
  const { showNotification } = useNotification();
  const { showDialog } = useDialog();
  
  // Fetch employees when component mounts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        
        const jobName = getFallbackJob();
        console.log("Fetching employees for job:", jobName);
        
        // Use the fetchWithFallback utility for consistency
        const data = await fetchWithFallback<EmployeeBackend[]>(
          'getEmployees', 
          { job: jobName },
          true // Use mock data if fetch fails
        );
        
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
        } else {
          // Transform backend data to frontend Employee type using the convertBackendToEmployee function
          const formattedEmployees = data.map(emp => convertBackendToEmployee(emp));
          setEmployees(formattedEmployees);
        }
      } catch (err) {
        console.error('Chyba při načítání zaměstnanců:', err);
        setError('Chyba při načítání zaměstnanců');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);
  
  const openConfirmModal = (employee: Employee) => {
    if (!employee || !employee.id) {
      console.error('[HCYK_BOSSACTIONS] Invalid employee:', employee);
      showNotification('error', 'Chyba: Neplatný zaměstnanec');
      return;
    }
  
    const employeeId = typeof employee.id === 'number' ? employee.id : parseInt(String(employee.id), 10);
    
    if (isNaN(employeeId)) {
      console.error('[HCYK_BOSSACTIONS] Invalid employee ID:', employee.id);
      showNotification('error', 'Chyba: Neplatný identifikátor zaměstnance');
      return;
    }
    
    console.log('[HCYK_BOSSACTIONS] Opening fire confirmation for employee ID:', employeeId);
    
    setSelectedEmployee({
      ...employee,
      id: employeeId
    });
    setSeveranceAmount(Math.round(employee.salary / 2));
    setShowConfirmModal(true);
  };
  
  const handleFire = async () => {
    if (!selectedEmployee) return;
  
    try {
      const jobName = getFallbackJob();
      
      const employeeId = String(selectedEmployee.id);
      
      if (!employeeId || employeeId === 'NaN' || employeeId === 'undefined') {
        console.error('[HCYK_BOSSACTIONS] Invalid employee ID:', employeeId);
        showNotification('error', 'Chyba: Neplatný identifikátor zaměstnance');
        return;
      }
      
      console.log('[HCYK_BOSSACTIONS] Firing employee:', employeeId, 'from job:', jobName);
      
      const result = await fetchWithFallback<{success: boolean; message?: string}>(
        'fireEmployee', 
        {
          job: jobName,
          identifier: employeeId
        }
      );
      
      if (result.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
        setShowConfirmModal(false);
        showNotification('success', 'Zaměstnanec byl úspěšně propuštěn');
      } else {
        showNotification('error', result.message || 'Nepodařilo se propustit zaměstnance');
      }
    } catch (err) {
      console.error('[HCYK_BOSSACTIONS] Error firing employee:', err);
      showNotification('error', 'Nastala chyba při propouštění');
    }
  };
  
  if (loading) return <div>Načítání zaměstnanců...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Propustit</h2>
      <div className="employees-list">
        {employees.map(emp => (
          <div key={emp.id} className="employee-card">
            <div className="employee-info">
              <h3>{emp.name}</h3>
              <p>Pozice: {emp.role}</p>
              <p>Plat: ${emp.salary}</p>
              <p>Výkon: {emp.performance || 75}%</p>
            </div>
            <button className="danger-btn" onClick={() => openConfirmModal(emp)}>Propustit</button>
          </div>
        ))}
      </div>
      
      <Modal
        isOpen={showConfirmModal}
        title="Potvrďte propuštění"
        onClose={() => setShowConfirmModal(false)}
      >
        {selectedEmployee && (
          <>
            <p>Opravdu chcete propustit zaměstnance {selectedEmployee.name}?</p>
            
            <div className="form-group">
              <label htmlFor="severance">Odstupné:</label>
              <input 
                type="number" 
                id="severance"
                value={severanceAmount}
                onChange={(e) => setSeveranceAmount(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                step="100"
                className="number-input"
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={handleFire} className="danger-btn">Propustit</button>
              <button onClick={() => setShowConfirmModal(false)} className="cancel-btn">Zrušit</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default FireTab;