import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import DatasetAnalysis from './pages/DatasetAnalysis';
import ROISimulator from './pages/ROISimulator';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="landing" element={<Navigate to="/" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="predict" element={<Predict />} />
          <Route path="dataset-analysis" element={<DatasetAnalysis />} />
          <Route path="roi" element={<ROISimulator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
