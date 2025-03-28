import React, { useState, useEffect } from "react";
import { NotificationProvider } from './context/NotificationContext';
import { DialogProvider } from './context/DialogContext';
import { debugData } from "./utils/debugData";
import EmployeesTab from "./components/EmployeesTab";
import HireTab from "./components/HireTab";
import FireTab from "./components/FireTab";
import FinancesTab from "./components/FinancesTab";
import FactionManagementTab from "./components/FactionManagementTab";

// Import stylesheets
import "./styles/App.css";
import "./styles/Employees.css";
import "./styles/Finances.css";
import "./styles/Modal.css";
import "./styles/Hire.css";
import "./styles/EmployeeDetail.css";
import "./styles/Notification.css";
import "./styles/Dialog.css";
import "./styles/FactionManagement.css";

debugData([
  {
    action: "setVisible",
    data: true,
  },
]);

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("employees");
  
  const handleClose = () => {
    setIsMenuOpen(false);
    
    fetch(`https://hcyk_bossmenu/hideUI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response error: ${response.status}`);
      }
      return response.json();
    })
    .catch(err => {
      setTimeout(() => {
        fetch(`https://hcyk_bossmenu/hideUI`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(e => {
          // Silently fail on second attempt
        });
      }, 500);
    });
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && 
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) &&
          !((e.target as HTMLElement).getAttribute('contenteditable') === 'true')) {
        e.preventDefault();
      }
      
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      
      if (data.action === 'setVisible') {
        setIsMenuOpen(data.data === true);
        
        if (data.job) {
          window.latestJobData = typeof data.job === 'string' 
            ? data.job 
            : (data.job.name || data.job.job || String(data.job));
        }
        
        if (data.playerData) {
          window.PlayerData = data.playerData;
          
          const refreshEvent = new CustomEvent('jobDataUpdated', { 
            detail: { job: data.playerData.job?.name || data.playerData.job } 
          });
          window.dispatchEvent(refreshEvent);
        }
      }
      else if (data.action === 'initData') {
        if (data.playerData) {
          window.PlayerData = data.playerData;
          
          if (data.playerData.job) {
            const jobName = typeof data.playerData.job === 'string' 
              ? data.playerData.job 
              : data.playerData.job.name || '';
              
            window.latestJobData = jobName;
          }
          
          const refreshEvent = new CustomEvent('jobDataUpdated', { 
            detail: { job: data.playerData.job?.name || data.playerData.job }
          });
          window.dispatchEvent(refreshEvent);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  const renderContent = () => {
    switch(activeTab) {
      case "employees":
        return <EmployeesTab />;
      case "hire":
        return <HireTab />;
      case "fire":
        return <FireTab />;
      case "finances":
        return <FinancesTab />;
      case "ranks":
        return <FactionManagementTab />;
      default:
        return <EmployeesTab />;
    }
  };
  
  return (
    <NotificationProvider>
      <DialogProvider>
        <div className="nui-wrapper">
          {isMenuOpen && (
            <div className="popup-thing">
              <div className="popup-header">
                <h1>Boss Menu</h1>
                <div className="navbar">
                  <ul>
                    <li>
                      <a 
                        href="#" 
                        className={activeTab === "employees" ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("employees");
                        }}
                      >
                        Zaměstnanci
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#" 
                        className={activeTab === "hire" ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("hire");
                        }}
                      >
                        Zaměstnat
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#" 
                        className={activeTab === "fire" ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("fire");
                        }}
                      >
                        Propustit
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#" 
                        className={activeTab === "finances" ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("finances");
                        }}
                      >
                        Finance
                      </a>
                    </li>
                    <li>
                      <a 
                        href="#" 
                        className={activeTab === "ranks" ? "active" : ""}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("ranks");
                        }}
                      >
                        Správa frakce
                      </a>
                    </li>
                  </ul>
                </div>
                <button className="exit-btn" onClick={handleClose}>
                  <span>X</span>
                </button>
              </div>
              
              <div className="content-area">
                {renderContent()}
              </div>
            </div>
          )}
        </div>
      </DialogProvider>
    </NotificationProvider>
  );
};

export default App;