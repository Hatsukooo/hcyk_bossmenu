import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useNotification } from '../context/NotificationContext';
import { fetchWithFallback, getFallbackJob } from '../utils/api';
import {safelyExtractEmployeeId, convertEmployeeData, Employee, RawEmployee } from '../utils/employee-data-fix';

const FireTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [severanceAmount, setSeveranceAmount] = useState<number>(0);
  const { showNotification } = useNotification();
  
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        
        const jobName = getFallbackJob();
        //console.log("[DEBUG] Fetching employees for job:", jobName);
        
        const data = await fetchWithFallback<RawEmployee[]>(
          'getEmployees', 
          { job: jobName },
          true // Use mock data if fetch fails
        );
        
        //console.log("[DEBUG] Raw employee data:", JSON.stringify(data));
        
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
        } else {
          // Transform backend data to frontend Employee type using our improved converter
          const formattedEmployees = data.map(emp => convertEmployeeData(emp));
          //console.log("[DEBUG] Formatted employees:", JSON.stringify(formattedEmployees));
          setEmployees(formattedEmployees);
        }
      } catch (err) {
        //console.error('[DEBUG] Error fetching employees:', err);
        setError('Chyba při načítání zaměstnanců');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);
  
  const openConfirmModal = (employee: Employee) => {
    //console.log('[DEBUG] openConfirmModal called with employee:', JSON.stringify(employee));
    
    if (!employee) {
      //console.error('[DEBUG] Invalid employee:', employee);
      showNotification('error', 'Chyba: Neplatný zaměstnanec');
      return;
    }
  
    // Convert the employee data to ensure it's in the right format
    const cleanEmployee = convertEmployeeData(employee);
    
    //console.log('[DEBUG] Opening fire confirmation for employee:', cleanEmployee.name);
    
    setSelectedEmployee(cleanEmployee);
    setSeveranceAmount(Math.round(cleanEmployee.salary / 2));
    setShowConfirmModal(true);
  };
  
  const handleFire = async () => {
    if (!selectedEmployee) return;
  
    try {
      const jobName = getFallbackJob();
      
      // Extract the employee ID safely
      const employeeId = safelyExtractEmployeeId(selectedEmployee);
      
      if (!employeeId) {
        //console.error('[DEBUG] Invalid employee ID:', selectedEmployee);
        showNotification('error', 'Chyba: Neplatný identifikátor zaměstnance');
        return;
      }
      
      //console.log('[DEBUG] Firing employee:', employeeId, 'from job:', jobName);
      
      const result = await fetchWithFallback<{success: boolean; message?: string}>(
        'fireEmployee', 
        {
          job: jobName,
          identifier: employeeId
        }
      );
      
      if (result.success) {
        // Update the local employees list
        setEmployees(prev => prev.filter(emp => {
          const currentEmpId = safelyExtractEmployeeId(emp);
          return currentEmpId !== employeeId;
        }));
        
        setShowConfirmModal(false);
        showNotification('success', 'Zaměstnanec byl úspěšně propuštěn');
      } else {
        showNotification('error', result.message || 'Nepodařilo se propustit zaměstnance');
      }
    } catch (err) {
      //console.error('[DEBUG] Error firing employee:', err);
      showNotification('error', 'Nastala chyba při propouštění');
    }
  };
  
  if (loading) return <div>Načítání zaměstnanců...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tab-content">
      <h2>Propustit</h2>
      <div className="employees-list">
        {employees.map(emp => {
          return (
            <div key={String(emp.id || Math.random())} className="employee-card">
              <div className="employee-info">
                <h3>{emp.name}</h3>
                <p>Pozice: {emp.role}</p>
                <p>Plat: ${emp.salary}</p>
                <p>Výkon: {emp.performance || 75}%</p>
              </div>
              <button className="danger-btn" onClick={() => openConfirmModal(emp)}>Propustit</button>
            </div>
          );
        })}
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