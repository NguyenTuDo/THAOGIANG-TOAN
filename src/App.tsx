import { Navigate, Route, Routes } from 'react-router-dom';
import { GuidebookPage } from './pages/GuidebookPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuidebookPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
