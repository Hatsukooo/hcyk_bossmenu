import React, { useState, useEffect } from 'react';
import { fetchWithFallback, getFallbackJob } from '../utils/api';

const FinancesTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>("week");
  const [societyMoney, setSocietyMoney] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financeStats, setFinanceStats] = useState({
    income: 0,
    expenses: 0,
    netProfit: 0
  });

  // Fetch society money and financial stats
  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const job = getFallbackJob();
        
        // Fetch society money
        const moneyData = await fetchWithFallback<number>(
          'getSocietyMoney', 
          { job }, 
          true // Use mock data if fetch fails
        );
        
        setSocietyMoney(moneyData || 0);

        // Fetch financial stats
        const statsData = await fetchWithFallback<{
          income: number;
          expenses: number;
          netProfit: number;
        }>(
          'getFinancialStats', 
          { 
            job,
            timeRange
          }, 
          true // Use mock data if fetch fails
        );
        
        setFinanceStats({
          income: statsData.income || 0,
          expenses: statsData.expenses || 0,
          netProfit: statsData.netProfit || 0
        });
      } catch (err) {
        //console.error('Chyba při načítání financí:', err);
        setError('Chyba při načítání financí');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [timeRange]);

  if (loading) return <div>Načítání financí...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="tab-content">
      <div className="finance-header">
        <h2>Finance</h2>
        <div className="time-filter">
          <button 
            className={timeRange === "week" ? "active-filter" : ""} 
            onClick={() => setTimeRange("week")}
          >
            Týden
          </button>
          <button 
            className={timeRange === "month" ? "active-filter" : ""} 
            onClick={() => setTimeRange("month")}
          >
            Měsíc
          </button>
          <button 
            className={timeRange === "year" ? "active-filter" : ""} 
            onClick={() => setTimeRange("year")}
          >
            Rok
          </button>
        </div>
      </div>
      
      <div className="finance-overview">
        <div className="finance-card">
          <h3>Zůstatek společnosti</h3>
          <div className="balance">${societyMoney.toLocaleString()}</div>
        </div>
        
        <div className="finance-stats">
          <div className="stat-item">
            <h4>Příjmy ({timeRange === "week" ? "týdenní" : timeRange === "month" ? "měsíční" : "roční"})</h4>
            <div className="stat-value income">+${financeStats.income.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <h4>Výdaje ({timeRange === "week" ? "týdenní" : timeRange === "month" ? "měsíční" : "roční"})</h4>
            <div className="stat-value expenses">-${financeStats.expenses.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <h4>Čistý zisk</h4>
            <div className="stat-value net">+${financeStats.netProfit.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancesTab;