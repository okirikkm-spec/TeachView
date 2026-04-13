import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainPage from './pages/MainPage';
import ProfilePage from './pages/ProfilePage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import PlaylistPlayerPage from './pages/PlaylistPlayerPage';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/"              element={<MainPage />} />
            <Route path="/profile"       element={<ProfilePage />} />
            <Route path="/profile/:id"   element={<ProfilePage />} />
            <Route path="/video/:id" element={<VideoPlayerPage />} />
            <Route path="/playlist/:id" element={<PlaylistPlayerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
