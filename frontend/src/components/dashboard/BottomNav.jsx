import React from 'react';
import { LayoutDashboard, Receipt, ShieldCheck, Target, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'gastos', label: 'Gastos', icon: Receipt },
    { id: 'fixos', label: 'Fixos', icon: ShieldCheck },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'perfil', label: 'Perfil', icon: User }
  ];

  return (
    <nav className="bottom-nav-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-tab-item ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <span className="nav-tab-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} color={isActive ? '#10b981' : '#94a3b8'} />
            </span>
            <span className="nav-tab-label" style={{ color: isActive ? '#10b981' : '#94a3b8', fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
