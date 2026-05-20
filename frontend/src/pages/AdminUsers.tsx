import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Search, User as UserIcon, Mail, Calendar, Shield, MoreVertical } from 'lucide-react';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'stationMaster' | 'admin';
  createdAt: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', text: 'Administrator' };
      case 'stationMaster':
        return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', text: 'Station Master' };
      default:
        return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', text: 'Customer' };
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>User Management</h1>
        <p style={{ color: '#94a3b8' }}>View and manage all platform users and roles</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              background: '#0f172a', 
              border: '1px solid #1e293b', 
              borderRadius: '12px', 
              padding: '14px 14px 14px 48px',
              color: 'white',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ 
            background: '#0f172a', 
            border: '1px solid #1e293b', 
            borderRadius: '12px', 
            padding: '12px 20px', 
            color: 'white', 
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="All">All Roles</option>
          <option value="user">Customers</option>
          <option value="stationMaster">Station Masters</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '100px 0' }}><Loader /></div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState 
          message="No users found" 
          subMessage={searchTerm ? `No results for "${searchTerm}"` : "The user list is currently empty."} 
        />
      ) : (
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>USER</th>
                <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>ROLE</th>
                <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>JOINED DATE</th>
                <th style={{ padding: '20px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const badge = getRoleBadge(u.role);
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '12px', 
                          background: 'rgba(56, 189, 248, 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: '#38bdf8'
                        }}>
                          <UserIcon size={20} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: 'white' }}>{u.name}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Mail size={12} /> {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.color}30`
                      }}>
                        <Shield size={12} />
                        {badge.text}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px' }}>
                        <Calendar size={14} />
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
