import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Compass, RotateCcw, Search, Plus, Minus } from 'lucide-react';
import {
  TouristLocation, Route, AppMode, UIMode,
  AlgorithmStep, SelectedElement,
} from '../types';

interface GraphCanvasProps {
  locations: TouristLocation[];
  routes: Route[];
  appMode: AppMode;
  uiMode: UIMode;
  startId: string;
  endId: string | null;
  selectedSubset: string[];
  currentStep: AlgorithmStep | null;
  highlightedPaths: string[][];
  activePathIndex: number;
  selectedElement: SelectedElement;
  onLocationClick: (id: string) => void;
  onLocationDrag: (id: string, x: number, y: number) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onRouteClick: (id: string) => void;
  onSelectElement: (el: SelectedElement) => void;
  // Edge drawing in edit mode
  edgeStart: string | null;
  onEdgeStartSet: (id: string | null) => void;
  onAddRoute: (from: string, to: string) => void;
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  'Danh lam thắng cảnh': '#0ea5e9',
  'Ẩm thực': '#f97316',
  'Mua sắm': '#a855f7',
  'Bảo tàng': '#14b8a6',
  'Công viên': '#22c55e',
  'Khách sạn': '#f59e0b',
};

function getNodeColor(
  loc: TouristLocation,
  currentStep: AlgorithmStep | null,
  highlightPath: string[],
  startId: string,
  endId: string | null,
  appMode: AppMode,
  selectedSubset: string[],
): { fill: string; ring: string; ringWidth: number } {
  const id = loc.id;

  // Algorithm step visualization
  if (currentStep) {
    if (currentStep.currentNodeId === id) {
      return { fill: currentStep.isBacktracking ? '#ef4444' : '#f59e0b', ring: currentStep.isBacktracking ? '#fca5a5' : '#fde68a', ringWidth: 5 };
    }
    if (currentStep.path.includes(id)) {
      return { fill: '#10b981', ring: '#6ee7b7', ringWidth: 3 };
    }
  }

  // Highlighted path (result)
  if (highlightPath.length > 0 && highlightPath.includes(id)) {
    return { fill: '#10b981', ring: '#6ee7b7', ringWidth: 3 };
  }

  // Role indicators
  if (id === startId) return { fill: '#3b82f6', ring: '#93c5fd', ringWidth: 4 };
  if (appMode === 'path' && id === endId) return { fill: '#f43f5e', ring: '#fda4af', ringWidth: 4 };
  if (appMode === 'subset' && selectedSubset.includes(id)) {
    return { fill: '#8b5cf6', ring: '#c4b5fd', ringWidth: 3 };
  }

  return { fill: CATEGORY_COLORS[loc.category] ?? '#64748b', ring: '', ringWidth: 0 };
}

function getEdgeColor(
  route: Route,
  currentStep: AlgorithmStep | null,
  highlightPath: string[],
): { stroke: string; width: number; dashed: boolean } {
  const { from, to } = route;

  if (currentStep) {
    const path = currentStep.path;
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === from && path[i+1] === to) || (path[i] === to && path[i+1] === from)) {
        return { stroke: currentStep.isBacktracking ? '#ef4444' : '#10b981', width: 3, dashed: false };
      }
    }
  }

  if (highlightPath.length > 1) {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      if (
        (highlightPath[i] === from && highlightPath[i+1] === to) ||
        (highlightPath[i] === to && highlightPath[i+1] === from)
      ) {
        return { stroke: '#10b981', width: 3.5, dashed: true };
      }
    }
  }

  return { stroke: '#94a3b8', width: 1.5, dashed: false };
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  locations, routes, appMode, uiMode, startId, endId,
  selectedSubset, currentStep, highlightedPaths, activePathIndex,
  selectedElement, onLocationClick, onLocationDrag, onCanvasDoubleClick,
  onRouteClick, onSelectElement, edgeStart, onEdgeStartSet, onAddRoute,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; loc: TouristLocation } | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);

  const highlightPath = highlightedPaths[activePathIndex] ?? [];

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const graphCenter = useMemo(() => {
    if (locations.length === 0) return { x: 450, y: 300 };
    const x = locations.reduce((sum, loc) => sum + loc.x, 0) / locations.length;
    const y = locations.reduce((sum, loc) => sum + loc.y, 0) / locations.length;
    return { x, y };
  }, [locations]);

  const fitToView = useCallback((locs: TouristLocation[]) => {
    const svgEl = svgRef.current;
    if (!svgEl || locs.length === 0) return;
    const svgW = svgEl.clientWidth;
    const svgH = svgEl.clientHeight;
    if (svgW === 0 || svgH === 0) return;

    const padding = 70;
    const minX = Math.min(...locs.map(l => l.x)) - padding;
    const maxX = Math.max(...locs.map(l => l.x)) + padding;
    const minY = Math.min(...locs.map(l => l.y)) - padding;
    const maxY = Math.max(...locs.map(l => l.y)) + padding;
    const graphW = maxX - minX;
    const graphH = maxY - minY;

    const scale = Math.min(svgW / graphW, svgH / graphH) * 0.92;
    const tx = (svgW - graphW * scale) / 2 - minX * scale;
    const ty = (svgH - graphH * scale) / 2 - minY * scale;

    d3.select(svgEl).call(
      zoomRef.current!.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  // Setup D3 zoom
  useEffect(() => {
    const svgEl = svgRef.current!;
    const svg = d3.select(svgEl);
    const g = svg.select<SVGGElement>('g.zoom-group');
    gRef.current = g.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', e => g.attr('transform', e.transform.toString()));

    zoomRef.current = zoom;
    svg.call(zoom);

    // Auto-fit after paint using rAF to ensure DOM has real dimensions
    const rafId = requestAnimationFrame(() => {
      fitToView(locations);
    });

    return () => {
      cancelAnimationFrame(rafId);
      svg.on('.zoom', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSvgDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (uiMode !== 'edit') return;
    const target = e.target as SVGElement;
    // Only trigger on background, not on nodes/edges
    if (target.tagName === 'svg' || target.classList.contains('canvas-bg')) {
      const rect = svgRef.current!.getBoundingClientRect();
      // Account for zoom/pan transform
      const transform = d3.zoomTransform(svgRef.current!);
      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;
      onCanvasDoubleClick(x, y);
    }
  }, [uiMode, onCanvasDoubleClick]);

  const handleNodeClick = useCallback((e: React.MouseEvent, loc: TouristLocation) => {
    e.stopPropagation();
    if (uiMode === 'edit' && edgeStart !== null) {
      // Complete edge drawing
      if (edgeStart !== loc.id) {
        onAddRoute(edgeStart, loc.id);
      }
      onEdgeStartSet(null);
      return;
    }
    onLocationClick(loc.id);
    onSelectElement({ type: 'location', id: loc.id });
  }, [uiMode, edgeStart, onAddRoute, onEdgeStartSet, onLocationClick, onSelectElement]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, loc: TouristLocation) => {
    if (uiMode !== 'edit') return;
    if (e.shiftKey) {
      // Start edge drawing
      e.stopPropagation();
      onEdgeStartSet(loc.id);
      return;
    }

    // Drag node
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = loc.x;
    const origY = loc.y;

    const onMove = (ev: MouseEvent) => {
      const transform = d3.zoomTransform(svgRef.current!);
      const dx = (ev.clientX - startX) / transform.k;
      const dy = (ev.clientY - startY) / transform.k;
      onLocationDrag(loc.id, origX + dx, origY + dy);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [uiMode, onEdgeStartSet, onLocationDrag]);

  const handleEdgeClick = useCallback((e: React.MouseEvent, route: Route) => {
    e.stopPropagation();
    onRouteClick(route.id);
    onSelectElement({ type: 'route', id: route.id });
  }, [onRouteClick, onSelectElement]);

  const zoomBy = useCallback((factor: number) => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomRef.current) return;
    d3.select(svgEl).transition().duration(220).call(zoomRef.current.scaleBy, factor);
  }, []);

  const resetViewport = useCallback(() => {
    setRotationDeg(0);
    fitToView(locations);
  }, [fitToView, locations]);

  const rotateBy = useCallback((delta: number) => {
    setRotationDeg(current => {
      const next = (current + delta) % 360;
      return next < 0 ? next + 360 : next;
    });
  }, []);

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200">
      <svg
        ref={svgRef}
        className="w-full h-full"
        onDoubleClick={handleSvgDoubleClick}
        onClick={() => { onSelectElement(null); if (edgeStart) onEdgeStartSet(null); }}
      >
        {/* Dot grid background */}
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#e2e8f0" />
          </pattern>
        </defs>
        <rect className="canvas-bg" width="100%" height="100%" fill="url(#dot-grid)" />

        <g className="zoom-group">
          <g transform={`rotate(${rotationDeg}, ${graphCenter.x}, ${graphCenter.y})`}>
          {/* Edges */}
          {routes.map(route => {
            const from = locations.find(l => l.id === route.from);
            const to = locations.find(l => l.id === route.to);
            if (!from || !to) return null;

            const { stroke, width, dashed } = getEdgeColor(route, currentStep, highlightPath);
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const isSelected = selectedElement?.type === 'route' && selectedElement.id === route.id;

            return (
              <g key={route.id} className="edge-group" onClick={e => handleEdgeClick(e, route)}>
                {/* Invisible wide hit area */}
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="transparent" strokeWidth={20} className="cursor-pointer" />
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isSelected ? '#f59e0b' : stroke}
                  strokeWidth={isSelected ? 3 : width}
                  strokeDasharray={dashed ? '8 4' : undefined}
                  className={`edge-path ${dashed ? 'dash-animate' : ''} pointer-events-none`}
                />
                {/* Distance label */}
                <g transform={`translate(${mx},${my})`}>
                  <rect x={-16} y={-9} width={32} height={18} rx={9}
                    fill="white" stroke={isSelected ? '#f59e0b' : '#e2e8f0'} strokeWidth={1.5} />
                  <text textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontWeight={600} fill={isSelected ? '#d97706' : '#64748b'}>
                    {route.distanceKm.toFixed(1)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Edge-drawing preview line */}
          {edgeStart && (() => {
            const from = locations.find(l => l.id === edgeStart);
            if (!from) return null;
            return (
              <line x1={from.x} y1={from.y} x2={from.x} y2={from.y}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                id="edge-preview" className="pointer-events-none" />
            );
          })()}

          {/* Nodes */}
          {locations.map(loc => {
            const { fill, ring, ringWidth } = getNodeColor(
              loc, currentStep, highlightPath, startId, endId, appMode, selectedSubset
            );
            const isCurrent = currentStep?.currentNodeId === loc.id;
            const isSelected = selectedElement?.type === 'location' && selectedElement.id === loc.id;
            const isEdgeStart = edgeStart === loc.id;

            return (
              <g key={loc.id}
                transform={`translate(${loc.x},${loc.y})`}
                className="cursor-pointer"
                onClick={e => handleNodeClick(e, loc)}
                onMouseDown={e => handleNodeMouseDown(e, loc)}
                onMouseEnter={() => setTooltip({ x: loc.x, y: loc.y, loc })}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Pulse ring for current node */}
                {isCurrent && (
                  <circle r={28} fill={fill} opacity={0.25} className="node-pulse" />
                )}
                {/* Selection / role ring */}
                {(ring || isSelected || isEdgeStart) && (
                  <circle r={22}
                    fill="none"
                    stroke={isEdgeStart ? '#f59e0b' : isSelected ? '#1d4ed8' : ring}
                    strokeWidth={isSelected ? 3 : ringWidth}
                    opacity={0.7}
                  />
                )}
                {/* Main circle */}
                <circle r={18} fill={fill} className="node-circle" />
                <circle r={18} fill="none" stroke="white" strokeWidth={2} />
                {/* Label */}
                {loc.label.includes('\n') ? (
                  loc.label.split('\n').map((line, i, arr) => (
                    <text key={i} textAnchor="middle"
                      y={arr.length === 2 ? (i === 0 ? -5 : 7) : (i === 0 ? -8 : i === 1 ? 1 : 9)}
                      fontSize={arr.length > 2 ? 7 : 8} fontWeight={700} fill="white">
                      {line}
                    </text>
                  ))
                ) : (
                  <text textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fontWeight={700} fill="white">
                    {loc.label}
                  </text>
                )}
              </g>
            );
          })}
          </g>
        </g>
      </svg>

      <div className="absolute right-3 top-3 z-10 flex w-[220px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white/92 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bản đồ tương đối</div>
            <div className="mt-1 text-sm font-bold text-slate-900">Điểm - cạnh - lộ trình</div>
          </div>
          <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
            {rotationDeg}°
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            title="Phóng to"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            title="Thu nhỏ"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fitToView(locations)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            title="Vừa khung nhìn"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetViewport}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            title="Đặt lại"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" /> Xoay bản đồ</span>
            <span>{rotationDeg}° / 360°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={rotationDeg}
            onChange={event => setRotationDeg(Number(event.target.value))}
            className="w-full accent-slate-800"
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => rotateBy(-15)}
              className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
            >
              -15°
            </button>
            <button
              type="button"
              onClick={() => setRotationDeg(0)}
              className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
            >
              0°
            </button>
            <button
              type="button"
              onClick={() => rotateBy(15)}
              className="rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100"
            >
              +15°
            </button>
          </div>
        </div>

        <div className="text-[11px] leading-5 text-slate-500">
          Kéo chuột để di chuyển, lăn chuột để phóng to/thu nhỏ, dùng thanh xoay để nhìn tuyến theo các hướng khác nhau.
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 pointer-events-none max-w-48"
          style={{ left: tooltip.x + 30, top: Math.max(8, tooltip.y - 30) }}
        >
          <div className="text-xs font-bold text-slate-800">{tooltip.loc.fullName}</div>
          <div className="text-[10px] text-slate-500 mt-0.5" style={{ color: CATEGORY_COLORS[tooltip.loc.category] }}>
            {tooltip.loc.category}
          </div>
          {tooltip.loc.description && (
            <div className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">
              {tooltip.loc.shortIntro ?? tooltip.loc.description}
            </div>
          )}
          {tooltip.loc.visitDuration && (
            <div className="text-[9px] text-slate-400 mt-1">
              Gợi ý thời lượng: {tooltip.loc.visitDuration}
            </div>
          )}
          {uiMode === 'edit' && (
            <div className="text-[9px] text-slate-400 mt-1 border-t border-slate-100 pt-1">
              Shift+click để vẽ cạnh
            </div>
          )}
        </div>
      )}

      {/* Edit mode hint */}
      {uiMode === 'edit' && (
        <div className="absolute bottom-3 right-3 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-700 font-medium leading-tight">
          ✏️ Chế độ chỉnh sửa<br />
          Double-click: thêm điểm<br />
          Shift+drag từ node: vẽ cạnh
        </div>
      )}
    </div>
  );
};
