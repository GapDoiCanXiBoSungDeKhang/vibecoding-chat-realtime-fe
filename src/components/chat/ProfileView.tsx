import React, { useState, useEffect } from 'react';
import { Camera, Mail, Phone, User, Shield, Check, Loader2 } from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.sub) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await userService.getCurrentProfile(user.sub);
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setPreview(data.avatar || null);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      if (avatar) {
        formData.append('file', avatar);
      }

      await userService.updateProfile(formData);
      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)', padding: '40px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '32px', fontSize: '28px' }}>My Profile</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <div className="avatar" style={{ width: '100px', height: '100px', fontSize: '32px' }}>
                {preview ? <img src={preview} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : name.charAt(0)}
              </div>
              <label htmlFor="avatar-upload" style={{
                position: 'absolute', bottom: '0', right: '0', background: 'var(--accent-blue)',
                color: 'white', width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', border: '3px solid white'
              }}>
                <Camera size={16} />
              </label>
              <input id="avatar-upload" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>Profile Picture</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>PNG, JPG or GIF. Max 5MB.</p>
            </div>
          </div>

          {/* Info Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--bg-tertiary)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--bg-tertiary)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--bg-tertiary)', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="auth-button" 
            style={{ width: 'auto', padding: '14px 32px', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            Save Changes
          </button>
        </form>

        {/* Security / Privacy placeholders */}
        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>Security & Privacy</h3>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--bg-tertiary)' }}>
            <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '10px' }}>
              <Shield size={24} color="var(--accent-blue)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Privacy Settings</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage who can see your online status and last seen.</div>
            </div>
            <button style={{ background: 'none', border: '1px solid var(--bg-tertiary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Manage</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
