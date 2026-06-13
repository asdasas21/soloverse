import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Trials from '@/pages/Trials';
import TrialSession from '@/pages/TrialSession';
import Profile from '@/pages/Profile';
import Certificate from '@/pages/Certificate';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/trials" element={<Trials />} />
        <Route path="/trials/:id" element={<TrialSession />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/cert/:id" element={<Certificate />} />
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}
