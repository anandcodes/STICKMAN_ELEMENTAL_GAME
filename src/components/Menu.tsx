import React from 'react';

interface MenuProps {
  highScore: number;
  furthestLevel: number;
  gems: number;
  difficulty: string;
  onSelect: (index: number) => void;
}

const Menu: React.FC<MenuProps> = ({ highScore, furthestLevel, gems, difficulty, onSelect }) => {
  return (
    <div className="menu-container">
      {/* Hidden SVG sprite */}
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
        <defs>
          <symbol id="icon-campaign" viewBox="0 0 24 24">
            <path d="M4 19V5a1 1 0 011-1h5v16H5a1 1 0 01-1-1z" opacity="0.2" />
            <path d="M6 4h12v2H6V4zm0 4h12v2H6V8zm0 4h12v2H6v-2z" />
            <path d="M18 6h2v14a1 1 0 01-1 1h-6v-2h5V6z" opacity="0.3" />
          </symbol>
          <symbol id="icon-survival" viewBox="0 0 24 24">
            <path d="M6.5 4.5l11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17.5 4.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7.5 16.5l-1.5 3.5 4-1 1-4-3.5 1.5z" fill="currentColor" opacity="0.25" />
          </symbol>
          <symbol id="icon-shop" viewBox="0 0 24 24">
            <path d="M7 6h10l1.2 8H5.8L7 6z" opacity="0.2" />
            <path d="M6 6L5 2h14l-1 4H6z" />
            <path d="M8 18a2 2 0 11-4 0 2 2 0 014 0zm12 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </symbol>
          <symbol id="icon-challenges" viewBox="0 0 24 24">
            <path d="M12 2l2.9 6.1 6.6.9-4.8 4.7 1.1 6.5L12 17.8 6.2 20.2l1.1-6.5L2.5 9l6.6-.9L12 2z" />
          </symbol>
          <symbol id="icon-gem" viewBox="0 0 24 24">
            <path d="M12 2l7 6-3 10-8 0-3-10 7-6z" fill="currentColor" opacity="0.85" />
            <path d="M12 2l7 6-3 10-8 0-3-10 7-6z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </symbol>
        </defs>
      </svg>

      <div className="menu-header">
        <div className="menu-stats">
          <div className="stat-item">
            <span className="stat-label">Best Score</span>
            <span className="stat-value">{highScore}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Level</span>
            <span className="stat-value">{Math.max(1, furthestLevel + 1)}</span>
          </div>
        </div>
        <div className="menu-gems">
          <div className="gem-icon">
            <svg>
              <use href="#icon-gem"></use>
            </svg>
          </div>
          <span className="gem-count">{gems}</span>
        </div>
      </div>

      <div className="menu-title">
        <h1>ELEMENTAL STICKMAN</h1>
      </div>

      <div className="menu-buttons">
        <button className="menu-button campaign" onClick={() => onSelect(0)}>
          <div className="button-icon">
            <svg>
              <use href="#icon-campaign"></use>
            </svg>
          </div>
          <div className="button-content">
            <div className="button-title">Campaign</div>
            <div className="button-subtitle">Progress through levels</div>
          </div>
        </button>

        <button className="menu-button survival" onClick={() => onSelect(1)}>
          <div className="button-icon">
            <svg>
              <use href="#icon-survival"></use>
            </svg>
          </div>
          <div className="button-content">
            <div className="button-title">Wave Survival</div>
            <div className="button-subtitle">Endless waves of enemies</div>
          </div>
        </button>

        <button className="menu-button shop" onClick={() => onSelect(2)}>
          <div className="button-icon">
            <svg>
              <use href="#icon-shop"></use>
            </svg>
          </div>
          <div className="button-content">
            <div className="button-title">Upgrade Shop</div>
            <div className="button-subtitle">Spend gems on upgrades</div>
          </div>
        </button>

        <button className="menu-button challenges" onClick={() => onSelect(3)}>
          <div className="button-icon">
            <svg>
              <use href="#icon-challenges"></use>
            </svg>
          </div>
          <div className="button-content">
            <div className="button-title">Daily Challenges</div>
            <div className="button-subtitle">Claim rewards and track progress</div>
          </div>
        </button>
      </div>

      <div className="menu-difficulty">
        <span>Difficulty: {difficulty.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default Menu;