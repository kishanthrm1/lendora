import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import BrowsePage from '@/pages/BrowsePage';
import ItemDetailPage from '@/pages/ItemDetailPage';
import ListItemPage from '@/pages/ListItemPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import AuthPage from '@/pages/AuthPage';

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Package className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-bold text-gray-900">BorrowBefore</span>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 BorrowBefore. Try before you buy.
          </p>
        </div>
      </div>
    </footer>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">This page doesn't exist.</p>
      <Link to="/" className="btn-primary mt-4">Go home</Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/categories" element={<BrowsePage />} />
              <Route path="/item/:id" element={<ItemDetailPage />} />
              <Route path="/list-item" element={<ListItemPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
