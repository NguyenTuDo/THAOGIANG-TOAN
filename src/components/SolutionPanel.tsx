import React from 'react';
import { TouristLocation, AlgorithmResult, AlgorithmStep, AppMode } from '../types';
import { PathDisplay } from './PathDisplay';

interface SolutionPanelProps {
  result: AlgorithmResult | null;
  currentStepIdx: number;
  appMode: AppMode;
  locations: TouristLocation[];
  activePathIndex: number;
  detailMode: 'result' | 'method';
}

const STEP_COLORS = {
  visit: 'border-l-emerald-400 bg-emerald-50',
  backtrack: 'border-l-red-400 bg-red-50',
  found: 'border-l-blue-400 bg-blue-50',
  no_solution: 'border-l-slate-400 bg-slate-50',
};

const STEP_ICONS = {
  visit: '▶',
  backtrack: '↩',
  found: '✓',
  no_solution: '✗',
};

export const SolutionPanel: React.FC<SolutionPanelProps> = ({
  result, currentStepIdx, appMode, locations, activePathIndex, detailMode,
}) => {
  const currentStep: AlgorithmStep | undefined = result?.steps[currentStepIdx];

  const getName = (id: string) => locations.find(l => l.id === id)?.fullName ?? id;

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
        <div className="mb-3 text-4xl">🗺️</div>
        <div className="mb-1 text-sm font-semibold text-slate-500">Chưa có kết quả</div>
        <div className="text-xs leading-relaxed">
          Chọn điểm xuất phát bên trái và nhấn{' '}
          <span className="font-bold text-slate-600">"Tìm Lộ Trình"</span>
        </div>
      </div>
    );
  }

  const activePath =
    appMode === 'path'
      ? result.shortestPath
      : result.shortestCycles[activePathIndex] ?? result.shortestCycles[0] ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-100 p-3">
        <PathDisplay
          path={activePath}
          totalKm={result.totalDistanceKm}
          locations={locations}
          appMode={appMode}
          allCount={appMode === 'path' ? (result.shortestPath.length > 0 ? 1 : 0) : result.shortestCycles.length}
        />
      </div>

      {detailMode === 'result' ? (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs leading-6 text-emerald-800">
            <div className="font-bold">Lớp 1: Kết quả trực quan</div>
            <div className="mt-1">
              Xem ngay tuyến đường tốt nhất trên bản đồ. Mỗi điểm chỉ đi qua một lần; nếu là chu trình thì bước cuối chỉ khép vòng về điểm đầu.
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tóm tắt nhanh</div>
            <div className="mt-2 space-y-2 text-xs text-slate-700">
              <div><strong>Số điểm tham gia:</strong> {locations.length}</div>
              <div><strong>Tổng chiều dài:</strong> {result.totalDistanceKm.toFixed(1)} km</div>
              <div><strong>Dạng lời giải:</strong> {appMode === 'path' ? 'Đường đi Hamilton' : 'Chu trình Hamilton / vòng khép kín'}</div>
              <div><strong>Cách trình bày:</strong> xem đường tô nổi trước, chỉ chuyển sang lớp sau khi cần giải thích cách thuật toán thử và quay lui.</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
            <div className="font-bold text-slate-800">Lớp 2 nằm phía sau</div>
            <div className="mt-1">
              Bấm sang tab <strong>Diễn giải cách làm</strong> để xem trạng thái từng điểm, bước quay lui và nhật ký thuật toán.
            </div>
          </div>
        </div>
      ) : (
        <>
          {currentStep && (
            <div className={`mx-3 mt-2 rounded-r-lg border-l-4 px-3 py-2 text-xs leading-relaxed fade-in-up ${STEP_COLORS[currentStep.type]}`}>
              <span className="mr-1 font-bold">{STEP_ICONS[currentStep.type]}</span>
              {currentStep.explanation}
            </div>
          )}

          {currentStep && (
            <div className="mx-3 mt-2 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                      Địa điểm tham gia
                    </th>
                    <th className="px-2 py-1.5 text-center font-semibold text-slate-500">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc, i) => {
                    const inPath = currentStep.path.includes(loc.id);
                    const isCurrent = currentStep.currentNodeId === loc.id;
                    const isBacktracking = currentStep.isBacktracking && isCurrent;
                    const visitIdx = currentStep.path.indexOf(loc.id);
                    const visitOrder = visitIdx >= 0 ? visitIdx + 1 : null;

                    let status = 'Chưa thăm';
                    let statusClass = 'text-slate-400';
                    let dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />;

                    if (isCurrent && !isBacktracking) {
                      status = 'Đang thăm';
                      statusClass = 'font-bold text-amber-600';
                      dot = <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />;
                    } else if (isCurrent && isBacktracking) {
                      status = 'Quay lui';
                      statusClass = 'font-bold text-red-500';
                      dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />;
                    } else if (inPath) {
                      status = `Đã thăm (lần ${visitOrder})`;
                      statusClass = 'font-bold text-emerald-600';
                      dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />;
                    }

                    return (
                      <tr
                        key={loc.id}
                        className={`border-b border-slate-50 transition-colors ${
                          isCurrent ? 'bg-amber-50' : inPath ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="px-2 py-1 text-slate-700">
                          <span className="mr-1 font-mono text-[9px] text-slate-300">{i + 1}.</span>
                          <span>{getName(loc.id)}</span>
                        </td>
                        <td className={`whitespace-nowrap px-2 py-1 text-center ${statusClass}`}>
                          <span className="inline-flex items-center justify-center">{dot}{status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 border-t border-emerald-100">
                ✓ Thuật toán đảm bảo mỗi điểm chỉ được thăm đúng 1 lần
              </div>
            </div>
          )}

          <div className="mt-2 px-3 pb-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nhật ký ({result.steps.length} bước)
              </div>
              <div className="text-[10px] text-slate-400">Cuộn để xem thêm</div>
            </div>
            <div className="max-h-[240px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-1.5">
              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`mb-1 rounded border-l-2 px-2 py-1 text-[10px] leading-4 transition-colors last:mb-0 ${
                    idx === currentStepIdx
                      ? `${STEP_COLORS[step.type]} border-l-current font-semibold`
                      : 'border-l-transparent text-slate-500 hover:bg-white'
                  }`}
                >
                  <span className="mr-1 font-mono text-slate-400">{idx + 1}.</span>
                  {STEP_ICONS[step.type]} {step.explanation}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
