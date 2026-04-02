import { Navigate, Route, Routes } from 'react-router-dom';
import { GuidebookPage } from './pages/GuidebookPage';
import { AdminPage } from './pages/AdminPage';
import { AdminAlgorithmsPage } from './pages/AdminAlgorithmsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuidebookPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/algorithms" element={<AdminAlgorithmsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
