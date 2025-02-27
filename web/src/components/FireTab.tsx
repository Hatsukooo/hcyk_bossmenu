import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Employee, EmployeeBackend } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';

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
        const response = await fetch('https://hcyk_bossmenu/getEmployees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: window.PlayerData?.job?.name || 'police' })
        });
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
          setError('Žádní zaměstnanci nenalezeni');
        } else {
          // Transform backend data to frontend Employee type
          const formattedEmployees = data.map((emp: EmployeeBackend) => ({
            id: emp.identifier,
            name: `${emp.firstname} ${emp.lastname}`,
            role: emp.grade_name,
            salary: emp.salary || 0,
            performance: 75,
            level: emp.grade
          }));
          
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
    setSelectedEmployee(employee);
    setSeveranceAmount(Math.round(employee.salary / 2));
    setShowConfirmModal(true);
  };
  
  const handleFire = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch('https://hcyk_bossmenu/fireEmployee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: selectedEmployee.id,
          job: window.PlayerData?.job?.name,
          severance: severanceAmount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Remove employee from list
        setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
        setShowConfirmModal(false);
        showNotification('success', 'Zaměstnanec byl úspěšně propuštěn');
      } else {
        showNotification('error', result.message || 'Nepodařilo se propustit zaměstnance');
      }
    } catch (err) {
      console.error('Chyba při propouštění:', err);
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
              <p>Výkon: {emp.performance}%</p>
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