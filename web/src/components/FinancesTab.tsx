import React, { useState, useEffect } from 'react';
import LineChart from './charts/LineChart';
import PieChart from './charts/PieChart';
import BarChart from './charts/BarChart';
import { financeData, expensesData } from '../data/mockData';
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
        console.error('Chyba při načítání financí:', err);
        setError('Chyba při načítání financí');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [timeRange]);
  
  // Celkový součet výdajů pro procentuální výpočet
  const totalExpenses = expensesData.reduce((sum, item) => sum + item.hodnota, 0);

  if (loading) return <div>Načítání financí...</div>;
  if (error) return <div className="error-message">{error}</div>;
  
  return (
    <div className="tab-content">
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
        <button className={timeRange === "year" ? "active-filter" : ""} 
          onClick={() => setTimeRange("year")}
        >
          Rok
        </button>
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
        
        <div className="finance-charts">
          <LineChart 
            data={financeData} 
            title="Vývoj financí (posledních 7 měsíců)" 
          />
          
          <div className="charts-row">
            <PieChart 
              data={expensesData} 
              title="Rozložení výdajů" 
              totalValue={totalExpenses} 
            />
            
            <BarChart 
              data={financeData} 
              title="Přehled zisku" 
              dataKey="zisk" 
              color="#4a90e2" 
            />
          </div>
          
          <div className="finance-breakdown">
            <h3>Rozpis výdajů</h3>
            <div className="expense-categories">
              {expensesData.map((item, index) => (
                <div className="expense-category" key={index}>
                  <div className="category-name">
                    <span className="category-color" style={{ backgroundColor: item.barva }}></span>
                    <span>{item.name}</span>
                  </div>
                  <div className="category-value">${item.hodnota}</div>
                  <div className="category-bar">
                    <div 
                      className="category-fill" 
                      style={{ 
                        width: `${(item.hodnota / totalExpenses * 100).toFixed(0)}%`, 
                        backgroundColor: item.barva 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancesTab;