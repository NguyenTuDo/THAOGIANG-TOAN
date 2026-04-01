// ─── Location / Graph types ───────────────────────────────────────────────────

export type LocationCategory =
  | 'Di sản học đường'
  | 'Danh lam thắng cảnh'
  | 'Ẩm thực'
  | 'Mua sắm'
  | 'Bảo tàng'
  | 'Công viên'
  | 'Khách sạn';

export interface TouristLocation {
  id: string;          // viết tắt 2-3 ký tự, VD: "BT"
  label: string;       // hiển thị ngắn trong node circle
  fullName: string;    // tên đầy đủ tiếng Việt
  fullNameEn?: string; // English full name
  category: LocationCategory;
  description: string;
  descriptionEn?: string;
  shortIntro?: string;
  shortIntroEn?: string;
  imageUrl?: string;   // ảnh chính (legacy, dùng images[] ưu tiên hơn)
  images?: string[];   // danh sách nhiều ảnh
  googleMapsUrl?: string;
  neighborhood?: string;
  neighborhoodEn?: string;
  visitDuration?: string;
  bestFor?: string;
  bestForEn?: string;
  highlights?: string[];
  highlightsEn?: string[];
  lat?: number;        // vĩ độ địa lý (dùng cho tính khoảng cách)
  lng?: number;        // kinh độ địa lý
  x: number;           // tọa độ canvas 0-900
  y: number;           // tọa độ canvas 0-600
}

export interface Route {
  id: string;          // [from,to].sort().join('__'), VD: "BT__NT"
  from: string;
  to: string;
  distanceKm: number;
}

export interface GraphData {
  locations: TouristLocation[];
  routes: Route[];
}

export interface PresetSelection {
  ids: string[];
  label: string;
  desc: string;
}

export type PresetSelectionMap = Record<AppMode, PresetSelection>;

// ─── App / UI modes ───────────────────────────────────────────────────────────

/** cycle  = Bài 1: Chu trình Hamilton (đủ điểm, quay về)
 *  path   = Bài 2: Đường đi Hamilton (A→B, đủ điểm)
 *  subset = Bài 3: Lộ trình tùy chọn (chọn tập con, vòng kín ngắn nhất)
 */
export type AppMode = 'cycle' | 'path' | 'subset';

/** view = chế độ xem/chọn điểm; edit = chế độ chỉnh sửa đồ thị */
export type UIMode = 'view' | 'edit';

export type UserRole = 'guest' | 'admin';

export interface AuthProfile {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface RolePermissions {
  canBrowseDestinations: boolean;
  canRunAlgorithms: boolean;
  canUsePresetRoutes: boolean;
  canAccessAdminPanel: boolean;
  canManageLocations: boolean;
  canManageRoutes: boolean;
  canManagePresets: boolean;
}

// ─── Algorithm types ──────────────────────────────────────────────────────────

export type StepType = 'visit' | 'backtrack' | 'found' | 'no_solution';

export interface AlgorithmStep {
  type: StepType;
  currentNodeId: string | null;
  path: string[];         // các node ID trong đường đi hiện tại
  totalWeight: number;    // tổng km tích lũy
  explanation: string;    // giải thích tiếng Việt
  isBacktracking: boolean;
}

export interface AlgorithmResult {
  found: boolean;
  shortestCycles: string[][];  // Bài 1 & 3: tất cả chu trình ngắn nhất (cùng trọng số)
  shortestPath: string[];      // Bài 2: đường đi ngắn nhất tìm được
  totalDistanceKm: number;
  steps: AlgorithmStep[];
}

// ─── UI interaction types ─────────────────────────────────────────────────────

export type SelectedElement =
  | { type: 'location'; id: string }
  | { type: 'route'; id: string }
  | null;

export interface AddLocationDialogState {
  open: boolean;
  x: number;
  y: number;
}

export interface EditEdgeDialogState {
  open: boolean;
  routeId: string | null;
}
