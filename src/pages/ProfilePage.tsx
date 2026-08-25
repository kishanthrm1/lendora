import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
    }
  }, [user, profile, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, bio, location })
      .eq('id', user.id);
    if (!error) {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-gray-900">Your Profile</h1>
      <p className="mt-1 text-sm text-gray-500">This information is visible to other users.</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-100 text-2xl font-bold text-teal-700">
          {fullName?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
        </div>
        <div>
          <p className="font-display text-lg font-bold text-gray-900">
            {fullName || 'Your name'}
          </p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell others a bit about yourself..."
            className="input-field resize-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA"
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-sm font-medium text-teal-600 animate-fade-in">Saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
