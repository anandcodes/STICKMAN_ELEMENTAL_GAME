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
          <div className="gem-icon">💎</div>
          <span className="gem-count">{gems}</span>
        </div>
      </div>

      <div className="menu-title">
        <h1>ELEMENTAL STICKMAN</h1>
      </div>

      <div className="menu-buttons">
        <button
          className="menu-button campaign"
          onClick={() => onSelect(0)}
        >
          <div className="button-icon">🗺️</div>
          <div className="button-content">
            <div className="button-title">Campaign</div>
            <div className="button-subtitle">Progress through levels</div>
          </div>
        </button>

        <button
          className="menu-button survival"
          onClick={() => onSelect(1)}
        >
          <div className="button-icon">⚔️</div>
          <div className="button-content">
            <div className="button-title">Wave Survival</div>
            <div className="button-subtitle">Endless waves of enemies</div>
          </div>
        </button>

        <button
          className="menu-button shop"
          onClick={() => onSelect(2)}
        >
          <div className="button-icon">🛒</div>
          <div className="button-content">
            <div className="button-title">Upgrade Shop</div>
            <div className="button-subtitle">Spend gems on upgrades</div>
          </div>
        </button>

        <button
          className="menu-button challenges"
          onClick={() => onSelect(3)}
        >
          <div className="button-icon">⭐</div>
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