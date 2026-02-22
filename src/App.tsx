import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherProvider, useTeacher } from './contexts/TeacherContext';
import { GamesProvider } from './contexts/GamesContext';
import Home from './pages/Home';
import Login from './pages/Login';
import AddItem from './pages/AddItem';
import ListItems from './pages/ListItems';
import ReviewConfig from './pages/ReviewConfig';
import ReviewSession from './pages/ReviewSession';
import PrintItems from './pages/PrintItems';
import GamesHub from './pages/GamesHub';
import GamesSetup from './pages/GamesSetup';
import GamesPlay from './pages/GamesPlay';
import GamesResults from './pages/GamesResults';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentTeacher } = useTeacher();
  if (!currentTeacher) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <TeacherProvider>
      <GamesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
            <Route path="/list" element={<ProtectedRoute><ListItems /></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><ReviewConfig /></ProtectedRoute>} />
            <Route path="/review/session" element={<ProtectedRoute><ReviewSession /></ProtectedRoute>} />
            <Route path="/print" element={<ProtectedRoute><PrintItems /></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute><GamesHub /></ProtectedRoute>} />
            <Route path="/games/setup" element={<ProtectedRoute><GamesSetup /></ProtectedRoute>} />
            <Route path="/games/play/:mode" element={<ProtectedRoute><GamesPlay /></ProtectedRoute>} />
            <Route path="/games/results" element={<ProtectedRoute><GamesResults /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </GamesProvider>
    </TeacherProvider>
  );
}
