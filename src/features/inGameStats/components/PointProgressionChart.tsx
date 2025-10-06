import React, { useMemo } from 'react';
import type { PointData } from '../../../types/inGameStats.types';
import './PointProgressionChart.css';

interface PointProgressionChartProps {
  points: PointData[];
  homeTeamName: string;
  opponentTeamName: string;
}

interface ChartPoint {
  x: number;
  y: number;
  homeScore: number;
  opponentScore: number;
}

/**
 * PointProgressionChart - Visualizes score progression throughout the set
 * Shows how the score difference evolves point by point
 */
export function PointProgressionChart({
  points,
  homeTeamName,
  opponentTeamName
}: PointProgressionChartProps) {
  const chartData = useMemo(() => {
    if (points.length === 0) return { points: [], minY: 0, maxY: 0 };

    const chartPoints: ChartPoint[] = points.map((point, index) => ({
      x: index + 1,
      y: point.home_score - point.opponent_score,
      homeScore: point.home_score,
      opponentScore: point.opponent_score
    }));

    const yValues = chartPoints.map((p) => p.y);
    const minY = Math.min(...yValues, 0);
    const maxY = Math.max(...yValues, 0);

    return { points: chartPoints, minY, maxY };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">No points to display</div>
      </div>
    );
  }

  // Chart dimensions
  const width = 100; // percentage
  const height = 200; // pixels
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  // Calculate scale
  const xRange = chartData.points.length;
  const yRange = Math.max(Math.abs(chartData.minY), Math.abs(chartData.maxY), 5);

  const getX = (pointNumber: number) => {
    const usableWidth = 100 - ((padding.left + padding.right) / width) * 100;
    return padding.left + (pointNumber / xRange) * usableWidth;
  };

  const getY = (scoreDiff: number) => {
    const usableHeight = height - padding.top - padding.bottom;
    const zeroY = padding.top + usableHeight / 2;
    const scale = usableHeight / (2 * yRange);
    return zeroY - scoreDiff * scale;
  };

  // Generate path for line chart
  const linePath = chartData.points
    .map((point, index) => {
      const x = getX(point.x);
      const y = getY(point.y);
      return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  // Generate path for area fill
  const areaPath = chartData.points.length > 0
    ? `${linePath} L ${getX(chartData.points[chartData.points.length - 1].x)},${getY(0)} L ${getX(1)},${getY(0)} Z`
    : '';

  const zeroLineY = getY(0);

  return (
    <div className="chart-container point-progression-chart">
      <h3 className="chart-title">Point Progression</h3>
      <div className="chart-legend">
        <span className="legend-item home">
          <span className="legend-color home"></span>
          {homeTeamName} Leading
        </span>
        <span className="legend-item opponent">
          <span className="legend-color opponent"></span>
          {opponentTeamName} Leading
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="chart-svg"
        style={{ width: '100%', height: `${height}px` }}
      >
        {/* Zero line (tie score) */}
        <line
          x1={padding.left}
          y1={zeroLineY}
          x2={100 - padding.right}
          y2={zeroLineY}
          className="zero-line"
        />

        {/* Area fill */}
        <path d={areaPath} className="area-fill" />

        {/* Line */}
        <path d={linePath} className="line-stroke" />

        {/* Data points */}
        {chartData.points.map((point) => (
          <circle
            key={point.x}
            cx={getX(point.x)}
            cy={getY(point.y)}
            r={0.8}
            className={point.y > 0 ? 'point-home' : point.y < 0 ? 'point-opponent' : 'point-tie'}
          >
            <title>
              Point {point.x}: {point.homeScore}-{point.opponentScore}
            </title>
          </circle>
        ))}

        {/* Y-axis labels */}
        <text x={padding.left - 5} y={getY(yRange)} className="axis-label" textAnchor="end">
          +{yRange}
        </text>
        <text x={padding.left - 5} y={zeroLineY} className="axis-label" textAnchor="end">
          0
        </text>
        <text x={padding.left - 5} y={getY(-yRange)} className="axis-label" textAnchor="end">
          -{yRange}
        </text>

        {/* X-axis labels */}
        <text x={padding.left} y={height - 5} className="axis-label" textAnchor="start">
          1
        </text>
        <text
          x={100 - padding.right}
          y={height - 5}
          className="axis-label"
          textAnchor="end"
        >
          {xRange}
        </text>
      </svg>

      <div className="chart-footer">
        <span className="footer-label">Score Difference (Home - Opponent)</span>
      </div>
    </div>
  );
}
