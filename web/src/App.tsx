import React, { useState, useEffect } from "react";
import { NotificationProvider } from './context/NotificationContext';
import { DialogProvider } from './context/DialogContext';
import { debugData } from "./utils/debugData";
import EmployeesTab from "./components/EmployeesTab";
import HireTab from "./components/HireTab";
import FireTab from "./components/FireTab";
import FinancesTab from "./components/FinancesTab";
import RanksManagementTab from "./components/RanksManagementTab";

// Import stylesheets
import "./styles/App.css";
import "./styles/Employees.css";
import "./styles/Finances.css";
import "./styles/Modal.css";
import "./styles/Hire.css";
import "./styles/EmployeeDetail.css";
import "./styles/Notification.css";
import "./styles/Dialog.css";
import "./styles/Ranks.css";

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
    
    // Vylepšený error handling pro fetch požadavek
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
    .then(data => {
      console.log("UI hide success:", data);
    })
    .catch(err => {
      console.error('Error closing UI:', err);
      // Přidáno jako fallback - pokud fetch selže, alespoň se pokusit poslat zprávu znovu
      setTimeout(() => {
        fetch(`https://hcyk_bossmenu/hideUI`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(e => console.error('Second attempt failed:', e));
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
      
      // Přidaný ESC handler
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Přidáno naslouchání pro NUI zprávy
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      
      if (data.action === 'setVisible') {
        setIsMenuOpen(data.data === true);
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
        return <RanksManagementTab />;
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
                        Hodnosti
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