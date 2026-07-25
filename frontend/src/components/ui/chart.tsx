"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Small reusable recharts wrappers themed to the admin tokens. Kept minimal and
 * on-theme; the first chart lib in the project (plan §5/§9).
 */

const AXIS_COLOR = "var(--app-muted)";
const GRID_COLOR = "var(--app-border)";
const ACCENT = "var(--app-fg)";

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatter?: (name: string, value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{
        borderColor: "var(--app-border)",
        background: "var(--app-surface-strong)",
        color: "var(--app-fg)",
      }}
    >
      {label ? (
        <p className="mb-1 font-medium" style={{ color: "var(--app-muted)" }}>
          {label}
        </p>
      ) : null}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color ?? ACCENT }}
          />
          <span>
            {formatter && entry.name
              ? formatter(entry.name, Number(entry.value ?? 0))
              : `${entry.name}: ${entry.value}`}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface TimeSeriesPoint {
  date: string;
  orders: number;
  netRevenue: number;
}

/**
 * Daily orders + net revenue as a dual-area time series. `netRevenue` is passed
 * in already converted to whole CHF for readable axes.
 */
export function OrdersRevenueChart({
  data,
  height = 220,
}: {
  data: TimeSeriesPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: AXIS_COLOR, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(name, value) =>
                name === "netRevenue"
                  ? `Net: CHF ${value.toFixed(2)}`
                  : `Orders: ${value}`
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="orders"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#ordersFill)"
          name="orders"
        />
        <Area
          type="monotone"
          dataKey="netRevenue"
          stroke="var(--app-muted)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
          name="netRevenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface MixDatum {
  label: string;
  value: number;
  color: string;
}

/** Delivery-type mix as a simple horizontal-friendly bar chart. */
export function DeliveryMixChart({
  data,
  height = 180,
}: {
  data: MixDatum[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "var(--app-surface-muted)" }}
          content={<ChartTooltip formatter={(name, value) => `${name}: ${value}`} />}
        />
        <Bar dataKey="value" name="letters" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
