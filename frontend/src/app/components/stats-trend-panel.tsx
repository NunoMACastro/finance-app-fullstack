import { BarChart3 } from "lucide-react";
import { formatMonthLong } from "../lib/formatting";
import { SeriesToggleButtonV3 } from "./v3/interaction-primitives-v3";

export interface StatsTrendPoint {
  month: string;
  name: string;
  income: number;
  expense: number;
  balance: number;
}

function SvgTrendChart({
  data,
  selectedIndex,
  visibleSeries,
  onSelectPoint,
}: {
  data: StatsTrendPoint[];
  selectedIndex: number | null;
  visibleSeries: {
    income: boolean;
    expense: boolean;
    balance: boolean;
  };
  onSelectPoint: (index: number) => void;
}) {
  const width = 340;
  const height = 210;
  const pad = { top: 20, right: 16, bottom: 26, left: 40 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  const values = data.flatMap((entry) => [
    ...(visibleSeries.income ? [entry.income] : []),
    ...(visibleSeries.expense ? [entry.expense] : []),
    ...(visibleSeries.balance ? [entry.balance] : []),
  ]);

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const ticks = Array.from({ length: 4 }, (_, index) => minValue + (range / 3) * index);

  const x = (index: number) =>
    pad.left + (chartWidth / Math.max(data.length - 1, 1)) * index;
  const y = (value: number) => pad.top + chartHeight - ((value - minValue) / range) * chartHeight;

  const linePoints = (key: "income" | "expense" | "balance") =>
    data.map((entry, index) => `${x(index)},${y(entry[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {ticks.map((tick, index) => (
        <g key={`tick-${index}`}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--chart-grid)"
            strokeDasharray="3 3"
          />
          <text
            x={pad.left - 5}
            y={y(tick) + 3}
            textAnchor="end"
            fill="var(--chart-axis)"
            fontSize="9"
          >
            {(tick / 1000).toFixed(1)}k€
          </text>
        </g>
      ))}

      {data.map((entry, index) => (
        <text
          key={`label-${entry.month}`}
          x={x(index)}
          y={height - 5}
          textAnchor="middle"
          fill="var(--chart-axis)"
          fontSize="9"
        >
          {entry.name}
        </text>
      ))}

      {visibleSeries.income ? (
        <polyline
          points={linePoints("income")}
          fill="none"
          stroke="var(--chart-income)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {visibleSeries.expense ? (
        <polyline
          points={linePoints("expense")}
          fill="none"
          stroke="var(--chart-expense)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {visibleSeries.balance ? (
        <polyline
          points={linePoints("balance")}
          fill="none"
          stroke="var(--chart-balance)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 4"
        />
      ) : null}

      {data.map((entry, index) => (
        <g key={`dot-${entry.month}`}>
          <rect
            x={x(index) - 12}
            y={pad.top}
            width={24}
            height={chartHeight}
            fill="transparent"
            onClick={() => onSelectPoint(index)}
          />
          {selectedIndex === index ? (
            <rect
              x={x(index) - 10}
              y={pad.top}
              width={20}
              height={chartHeight}
              fill="color-mix(in srgb, var(--primary) 8%, transparent)"
              rx={4}
            />
          ) : null}
          {visibleSeries.income ? (
            <circle
              cx={x(index)}
              cy={y(entry.income)}
              r={selectedIndex === index ? 4.5 : 3}
              fill="var(--chart-income)"
              stroke="var(--chart-dot-stroke)"
              strokeWidth={1.8}
            />
          ) : null}
          {visibleSeries.expense ? (
            <circle
              cx={x(index)}
              cy={y(entry.expense)}
              r={selectedIndex === index ? 4.5 : 3}
              fill="var(--chart-expense)"
              stroke="var(--chart-dot-stroke)"
              strokeWidth={1.8}
            />
          ) : null}
          {visibleSeries.balance ? (
            <circle
              cx={x(index)}
              cy={y(entry.balance)}
              r={selectedIndex === index ? 3.5 : 2.5}
              fill="var(--chart-balance)"
              stroke="var(--chart-dot-stroke)"
              strokeWidth={1.5}
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function StatsTrendPanel({
  trend,
  selectedIndex,
  onSelectPoint,
  visibleSeries,
  onToggleSeries,
  formatCurrency,
}: {
  trend: StatsTrendPoint[];
  selectedIndex: number | null;
  onSelectPoint: (index: number) => void;
  visibleSeries: {
    income: boolean;
    expense: boolean;
    balance: boolean;
  };
  onToggleSeries: (series: "income" | "expense" | "balance") => void;
  formatCurrency: (value: number) => string;
}) {
  const selectedPoint = selectedIndex !== null ? trend[selectedIndex] : null;

  return (
    <section
      className="space-y-3"
      data-tour="stats-trend-chart"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <div>
          <h3 className="text-sm text-foreground">Tendência mensal</h3>
          <p className="text-[11px] text-muted-foreground">Receitas, despesas e saldo.</p>
        </div>
      </div>

      {trend.length === 0 ? (
        <p className="rounded-xl bg-surface-soft/70 px-3 py-4 text-center text-sm text-muted-foreground">
          Ainda sem dados de tendência para este período.
        </p>
      ) : (
        <>
          <SvgTrendChart
            data={trend}
            selectedIndex={selectedIndex}
            visibleSeries={visibleSeries}
            onSelectPoint={onSelectPoint}
          />

          <div className="mt-3 flex items-center justify-center gap-2">
            <SeriesToggleButtonV3
              active={visibleSeries.income}
              tone="success"
              onClick={() => onToggleSeries("income")}
            >
              Receitas
            </SeriesToggleButtonV3>
            <SeriesToggleButtonV3
              active={visibleSeries.expense}
              tone="danger"
              onClick={() => onToggleSeries("expense")}
            >
              Despesas
            </SeriesToggleButtonV3>
            <SeriesToggleButtonV3
              active={visibleSeries.balance}
              tone="info"
              onClick={() => onToggleSeries("balance")}
            >
              Saldo
            </SeriesToggleButtonV3>
          </div>

          {selectedPoint ? (
            <div className="mt-3 rounded-xl bg-surface-soft/70 px-3 py-2">
              <p className="text-xs text-muted-foreground capitalize">
                {formatMonthLong(selectedPoint.month, null)}
              </p>
              <p className="mt-1 text-sm text-foreground">
                Receitas <span className="font-semibold">{formatCurrency(selectedPoint.income)}</span> ·
                Despesas <span className="font-semibold">{formatCurrency(selectedPoint.expense)}</span> ·
                Saldo <span className="font-semibold">{formatCurrency(selectedPoint.balance)}</span>
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
