import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Compass, RotateCcw, Search, Plus, Minus } from 'lucide-react';
import { haversineKm } from '../lib/geo';
import {
  TouristLocation, Route, AppMode, UIMode,
  AlgorithmStep, SelectedElement,
} from '../types';
import { CATEGORY_COLORS, getNodeColor, getEdgeColor } from '../lib/graphColors';

interface DistancePopup {
  fromId: string;
  toId: string;
  suggestedKm: number | null;
  screenX: number;
  screenY: number;
}

export interface GraphCanvasProps {
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
  onLocationDrag: (id: string, x: number, y: number, geo?: { lat: number; lng: number }) => void;
  onCanvasDoubleClick: (x: number, y: number) => void;
  onRouteClick: (id: string) => void;
  onSelectElement: (el: SelectedElement) => void;
  // Edge drawing in edit mode
  edgeStart: string | null;
  onEdgeStartSet: (id: string | null) => void;
  onAddRoute: (from: string, to: string, distanceKm: number) => void;
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

  // Edge drag state
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDraggingEdge, setIsDraggingEdge] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [distancePopup, setDistancePopup] = useState<DistancePopup | null>(null);
  const [popupDistance, setPopupDistance] = useState('');

  // Refs for latest values (used inside stable event-handler closures)
  const dragSourceRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const uiModeRef = useRef(uiMode);
  uiModeRef.current = uiMode;
  const rotationDegRef = useRef(rotationDeg);
  rotationDegRef.current = rotationDeg;
  const locationsRef = useRef(locations);
  locationsRef.current = locations;
  const routesRef = useRef(routes);
  routesRef.current = routes;

  const highlightPath = highlightedPaths[activePathIndex] ?? [];

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const graphCenter = useMemo(() => {
    if (locations.length === 0) return { x: 450, y: 300 };
    const x = locations.reduce((sum, loc) => sum + loc.x, 0) / locations.length;
    const y = locations.reduce((sum, loc) => sum + loc.y, 0) / locations.length;
    return { x, y };
  }, [locations]);

  const graphCenterRef = useRef(graphCenter);
  graphCenterRef.current = graphCenter;

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

  // Convert screen coordinates → graph (rotation-group) coordinates
  const screenToGraphSpace = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svgEl = svgRef.current!;
    const rect = svgEl.getBoundingClientRect();
    const transform = d3.zoomTransform(svgEl);
    // Screen → zoom-group space
    const zx = (clientX - rect.left - transform.x) / transform.k;
    const zy = (clientY - rect.top - transform.y) / transform.k;
    // Apply inverse rotation around graphCenter
    const θ = -(rotationDegRef.current * Math.PI) / 180;
    const cx = graphCenterRef.current.x;
    const cy = graphCenterRef.current.y;
    const dx = zx - cx;
    const dy = zy - cy;
    return {
      x: cx + dx * Math.cos(θ) - dy * Math.sin(θ),
      y: cy + dx * Math.sin(θ) + dy * Math.cos(θ),
    };
  }, []); // Stable — reads from refs

  // Start an edge-draw drag (used by handle mousedown and Shift+click)
  const startEdgeDrag = useCallback((sourceId: string) => {
    dragSourceRef.current = sourceId;
    isDraggingRef.current = true;
    setIsDraggingEdge(true);
    onEdgeStartSet(sourceId);

    const onDragMove = (e: MouseEvent) => {
      const pos = screenToGraphSpace(e.clientX, e.clientY);
      setMousePos(pos);
      const HIT = 24;
      const target = locationsRef.current.find(l =>
        l.id !== dragSourceRef.current &&
        Math.hypot(l.x - pos.x, l.y - pos.y) < HIT
      );
      setDragTarget(target?.id ?? null);
    };

    const onDragEnd = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', onDragEnd);
      isDraggingRef.current = false;
      setIsDraggingEdge(false);
      setMousePos(null);
      setDragTarget(null);

      const src = dragSourceRef.current;
      dragSourceRef.current = null;
      onEdgeStartSet(null);

      if (!src) return;

      // Re-compute target from final mouse position
      const pos = screenToGraphSpace(e.clientX, e.clientY);
      const HIT = 24;
      const target = locationsRef.current.find(l =>
        l.id !== src &&
        Math.hypot(l.x - pos.x, l.y - pos.y) < HIT
      );

      if (!target) return;

      // Prevent duplicate edges
      const exists = routesRef.current.some(r =>
        (r.from === src && r.to === target.id) ||
        (r.from === target.id && r.to === src)
      );
      if (exists) return;

      // Compute Haversine suggestion
      const fromLoc = locationsRef.current.find(l => l.id === src)!;
      const suggested =
        fromLoc.lat && fromLoc.lng && target.lat && target.lng
          ? haversineKm(fromLoc.lat, fromLoc.lng, target.lat, target.lng)
          : null;

      setDistancePopup({
        fromId: src,
        toId: target.id,
        suggestedKm: suggested,
        screenX: e.clientX,
        screenY: e.clientY,
      });
      setPopupDistance(suggested ? suggested.toFixed(1) : '');
    };

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }, [onEdgeStartSet, screenToGraphSpace]);

  // Track mouse when edgeStart is set via Shift+click (not drag) for preview line
  useEffect(() => {
    if (!edgeStart || isDraggingEdge) return;
    const onMove = (e: MouseEvent) => {
      setMousePos(screenToGraphSpace(e.clientX, e.clientY));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [edgeStart, isDraggingEdge, screenToGraphSpace]);

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
    };
  }, []);

  // Setup D3 zoom
  useEffect(() => {
    const svgEl = svgRef.current!;
    const svg = d3.select(svgEl);
    const g = svg.select<SVGGElement>('g.zoom-group');
    gRef.current = g.node();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .filter(event => {
        // Always allow mouse wheel for zooming
        if (event.type === 'wheel') return true;
        // In edit mode: only activate zoom/pan when clicking the background, not nodes/edges
        // This prevents D3 from calling preventDefault() on pointerdown over nodes,
        // which would suppress the mousedown event that drives our node-drag logic.
        if (uiModeRef.current === 'edit') {
          const target = event.target as SVGElement;
          return (
            target.tagName === 'svg' ||
            target.classList.contains('canvas-bg')
          );
        }
        return !event.button;
      })
      .on('zoom', e => g.attr('transform', e.transform.toString()));

    zoomRef.current = zoom;
    svg.call(zoom);

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
    if (target.tagName === 'svg' || target.classList.contains('canvas-bg')) {
      const rect = svgRef.current!.getBoundingClientRect();
      const transform = d3.zoomTransform(svgRef.current!);
      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;
      onCanvasDoubleClick(x, y);
    }
  }, [uiMode, onCanvasDoubleClick]);

  const handleNodeClick = useCallback((e: React.MouseEvent, loc: TouristLocation) => {
    e.stopPropagation();
    // Shift+click path: user clicked a target node after setting edgeStart
    if (uiMode === 'edit' && edgeStart !== null && !isDraggingEdge) {
      if (edgeStart !== loc.id) {
        const exists = routesRef.current.some(r =>
          (r.from === edgeStart && r.to === loc.id) ||
          (r.from === loc.id && r.to === edgeStart)
        );
        if (!exists) {
          const fromLoc = locationsRef.current.find(l => l.id === edgeStart)!;
          const suggested =
            fromLoc.lat && fromLoc.lng && loc.lat && loc.lng
              ? haversineKm(fromLoc.lat, fromLoc.lng, loc.lat, loc.lng)
              : null;
          setDistancePopup({
            fromId: edgeStart,
            toId: loc.id,
            suggestedKm: suggested,
            screenX: e.clientX,
            screenY: e.clientY,
          });
          setPopupDistance(suggested ? suggested.toFixed(1) : '');
        }
      }
      onEdgeStartSet(null);
      setMousePos(null);
      return;
    }
    onLocationClick(loc.id);
    onSelectElement({ type: 'location', id: loc.id });
  }, [uiMode, edgeStart, isDraggingEdge, onEdgeStartSet, onLocationClick, onSelectElement]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, loc: TouristLocation) => {
    if (uiMode !== 'edit') return;
    if (e.shiftKey) {
      // Shift+click starts edge drawing via drag mechanism
      e.stopPropagation();
      startEdgeDrag(loc.id);
      return;
    }

    e.stopPropagation();

    // Snapshot raw screen position and original graph position at mousedown.
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const origX = loc.x;
    const origY = loc.y;

    setIsDraggingNode(true);

    const onMove = (ev: MouseEvent) => {
      // Convert screen-space delta → graph-space delta.
      // Using deltas avoids the graphCenter dependency entirely:
      // the rotation pivot (graphCenter) cancels out when subtracting two points
      // in the same coordinate system, so shifting graphCenter during drag
      // does NOT affect the result.
      const transform = d3.zoomTransform(svgRef.current!);
      const dZoomX = (ev.clientX - startClientX) / transform.k;
      const dZoomY = (ev.clientY - startClientY) / transform.k;
      // Inverse-rotate the zoom-group delta to get graph-space delta.
      // α = rotationDeg (positive), inverse rotation = rotate by -α.
      const α = (rotationDegRef.current * Math.PI) / 180;
      const dx = dZoomX * Math.cos(α) + dZoomY * Math.sin(α);
      const dy = -dZoomX * Math.sin(α) + dZoomY * Math.cos(α);
      onLocationDrag(loc.id, origX + dx, origY + dy);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setIsDraggingNode(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [uiMode, startEdgeDrag, onLocationDrag]);

  const handleHandleMouseDown = useCallback((e: React.MouseEvent, loc: TouristLocation) => {
    e.stopPropagation();
    e.preventDefault();
    startEdgeDrag(loc.id);
  }, [startEdgeDrag]);

  const handleEdgeClick = useCallback((e: React.MouseEvent, route: Route) => {
    e.stopPropagation();
    onRouteClick(route.id);
    onSelectElement({ type: 'route', id: route.id });
  }, [onRouteClick, onSelectElement]);

  const handlePopupConfirm = useCallback(() => {
    if (!distancePopup) return;
    const km = parseFloat(popupDistance);
    if (isNaN(km) || km < 0.1) return;
    onAddRoute(distancePopup.fromId, distancePopup.toId, km);
    setDistancePopup(null);
  }, [distancePopup, popupDistance, onAddRoute]);

  const handlePopupCancel = useCallback(() => {
    setDistancePopup(null);
  }, []);

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

  // Nodes dimmed during edge drag (already connected to source)
  const existingNeighbors = useMemo(() => {
    const src = edgeStart;
    if (!src) return new Set<string>();
    return new Set(
      routes
        .filter(r => r.from === src || r.to === src)
        .map(r => r.from === src ? r.to : r.from)
    );
  }, [edgeStart, routes]);

  const isDrawingEdge = isDraggingEdge || (edgeStart !== null);

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200">
      <svg
        ref={svgRef}
        className="w-full h-full"
        onDoubleClick={handleSvgDoubleClick}
        onClick={() => { onSelectElement(null); if (edgeStart) { onEdgeStartSet(null); setMousePos(null); } }}
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

          {/* Edge-drawing preview line — follows cursor */}
          {isDrawingEdge && mousePos && (() => {
            const srcId = edgeStart ?? dragSourceRef.current;
            const from = locations.find(l => l.id === srcId);
            if (!from) return null;
            return (
              <line x1={from.x} y1={from.y} x2={mousePos.x} y2={mousePos.y}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                className="pointer-events-none" />
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
            const isDropTarget = dragTarget === loc.id;
            const isDimmed = isDrawingEdge &&
              !isEdgeStart &&
              existingNeighbors.has(loc.id) &&
              !isDropTarget;

            return (
              <g key={loc.id}
                transform={`translate(${loc.x},${loc.y})`}
                className="cursor-pointer"
                opacity={isDimmed ? 0.3 : 1}
                onClick={e => handleNodeClick(e, loc)}
                onMouseDown={e => handleNodeMouseDown(e, loc)}
                onMouseEnter={() => { if (!isDraggingEdge) setTooltip({ x: loc.x, y: loc.y, loc }); setHoveredNodeId(loc.id); }}
                onMouseLeave={() => { setTooltip(null); setHoveredNodeId(null); }}
              >
                {/* Pulse ring for current node */}
                {isCurrent && (
                  <circle r={28} fill={fill} opacity={0.25} className="node-pulse" style={{ pointerEvents: 'none' }} />
                )}
                {/* Drop target highlight ring */}
                {isDropTarget && (
                  <circle r={26} fill="none" stroke="#10b981" strokeWidth={3} opacity={0.9} style={{ pointerEvents: 'none' }} />
                )}
                {/* Selection / role ring */}
                {(ring || isSelected || isEdgeStart) && (
                  <circle r={22}
                    fill="none"
                    stroke={isEdgeStart ? '#f59e0b' : isSelected ? '#1d4ed8' : ring}
                    strokeWidth={isSelected ? 3 : ringWidth}
                    opacity={0.7}
                    style={{ pointerEvents: 'none' }}
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
                {/* Connection handle — visible on hover in edit mode */}
                {uiMode === 'edit' && hoveredNodeId === loc.id && !isDrawingEdge && (
                  <g
                    transform="translate(22,0)"
                    className="cursor-crosshair"
                    onMouseDown={e => handleHandleMouseDown(e, loc)}
                    onMouseEnter={e => { e.stopPropagation(); setHoveredNodeId(loc.id); }}
                  >
                    <circle r={7} fill="#f59e0b" stroke="white" strokeWidth={2} />
                    <line x1={-3} y1={0} x2={3} y2={0} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
                    <line x1={0} y1={-3} x2={0} y2={3} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
                  </g>
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
      {tooltip && !isDraggingEdge && !isDraggingNode && (
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
            <div className="text-[9px] text-amber-600 mt-1 border-t border-slate-100 pt-1 font-medium">
              Kéo handle vàng (+) để vẽ cạnh
            </div>
          )}
        </div>
      )}

      {/* Edit mode hint */}
      {uiMode === 'edit' && (
        <div className="absolute bottom-3 right-3 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-700 font-medium leading-tight">
          ✏️ Chế độ chỉnh sửa<br />
          Double-click: thêm điểm<br />
          Kéo handle vàng (+): vẽ cạnh
        </div>
      )}

      {/* Distance popup — appears after connecting two nodes */}
      {distancePopup && (
        <div
          className="fixed z-[200] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4"
          style={{
            left: Math.max(8, Math.min(distancePopup.screenX - 110, window.innerWidth - 240)),
            top: Math.max(8, distancePopup.screenY - 30),
            minWidth: 220,
          }}
        >
          <div className="text-xs font-bold text-slate-700 mb-1">Nhập khoảng cách (km)</div>
          <div className="text-[11px] text-slate-500 mb-2">
            <span className="font-semibold text-amber-600">{distancePopup.fromId}</span>
            {' → '}
            <span className="font-semibold text-amber-600">{distancePopup.toId}</span>
          </div>
          {distancePopup.suggestedKm !== null && (
            <div className="text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 mb-2">
              Haversine: ~{distancePopup.suggestedKm.toFixed(1)} km
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.1}
              max={9999}
              step={0.1}
              value={popupDistance}
              onChange={e => setPopupDistance(e.target.value)}
              autoFocus
              className="w-24 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
              placeholder="0.0"
              onKeyDown={e => {
                if (e.key === 'Enter') handlePopupConfirm();
                if (e.key === 'Escape') handlePopupCancel();
              }}
            />
            <button
              onClick={handlePopupConfirm}
              className="flex-1 bg-emerald-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Thêm cạnh
            </button>
            <button
              onClick={handlePopupCancel}
              className="bg-slate-100 text-slate-600 rounded-lg px-3 py-2 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              ✗
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
