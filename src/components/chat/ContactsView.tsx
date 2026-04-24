import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Check, X, UserMinus } from 'lucide-react';
import { friendService } from '../../services/friendService';
import toast from 'react-hot-toast';

const ContactsView: React.FC = () => {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        friendService.getFriends(),
        friendService.getFriendRequests()
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (id: string, action: 'accepted' | 'rejected') => {
    try {
      await friendService.respondToRequest(id, action);
      toast.success(`Request ${action}`);
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleUnfriend = async (userId: string) => {
    if (!window.confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await friendService.unfriend(userId);
      toast.success('Unfriended successfully');
      fetchData();
    } catch (error) {
      toast.error('Unfriend failed');
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading contacts...</div>;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div className="contacts-header" style={{ background: 'white' }}>
        <h2>Contacts</h2>
        <button className="auth-button" style={{ width: 'auto', padding: '10px 20px' }}>
          <UserPlus size={18} style={{ marginRight: '8px' }} /> Add Friend
        </button>
      </div>

      {requests.length > 0 && (
        <div className="contacts-section">
          <h3>Friend Requests ({requests.length})</h3>
          {requests.map((req) => (
            <div key={req._id} className="contact-card">
              <div className="avatar">{req.senderId?.name?.charAt(0) || 'U'}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{req.senderId?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>wants to be your friend</div>
              </div>
              <div className="contact-actions">
                <button className="btn-icon success" onClick={() => handleRespond(req._id, 'accepted')}>
                  <Check size={18} />
                </button>
                <button className="btn-icon danger" onClick={() => handleRespond(req._id, 'rejected')}>
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="contacts-section">
        <h3>My Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'white', borderRadius: '12px' }}>
            No friends yet. Start adding some!
          </div>
        ) : (
          friends.map((friend) => (
            <div key={friend._id} className="contact-card">
              <div className="avatar">{friend.name?.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{friend.name}</div>
                <div style={{ fontSize: '13px', color: '#20c997' }}>Active now</div>
              </div>
              <div className="contact-actions">
                <button className="btn-icon">
                  <UserCheck size={18} />
                </button>
                <button className="btn-icon danger" onClick={() => handleUnfriend(friend._id)}>
                  <UserMinus size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsView;
