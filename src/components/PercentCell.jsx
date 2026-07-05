/* ═══════════════════════════════════════════════════════════════
   PercentCell — Gradient-filled Percentage — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { getPercentGradient } from '../utils/colorUtils.js';

export default function PercentCell({ percent }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const gradient = getPercentGradient(p);

  return (
    <div className="percent-cell">
      <div
        className="percent-cell-fill"
        style={{
          width: `${p}%`,
          background: gradient,
        }}
      />
      <span className="percent-cell-text">{p}%</span>
    </div>
  );
}
