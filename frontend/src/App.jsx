import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/DashBoard'; // match your actual filename
import Session from './pages/session';     // lowercase 's' matches your file
import Analytics from './pages/analytics';
import RecordPage from './pages/RecordPage';
import { AuthProvider } from './context/authContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/session" element={<Session />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/record" element={<RecordPage />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
