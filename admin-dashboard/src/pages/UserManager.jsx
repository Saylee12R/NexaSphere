import { useState, useEffect } from 'react';
import UserTimelineModal from '../components/UserTimelineModal';

const ROLES = ['member', 'moderator', 'admin'];

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [awardBadgeUser, setAwardBadgeUser] = useState(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    icon: 'Award',
  });
  const [editUser, setEditUser] = useState(null);
  const [timelineUser, setTimelineUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    email: '',
    admin_roles: 'member',
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importJobId, setImportJobId] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let interval;
    if (importJobId && importProgress !== 100) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/bulk/jobs/${importJobId}`, { credentials: 'include' });
          if (res.ok) {
            const job = await res.json();
            setImportProgress(job.progress);
            if (job.status === 'completed' || job.status === 'failed') {
              setImportErrors(job.errors || []);
              clearInterval(interval);
              fetchUsers(); // Refresh after import
            }
          }
        } catch (err) {
          console.error('Failed to poll job status');
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [importJobId, importProgress]);

  function downloadCsvTemplate() {
    const template = 'email,username,displayname,role,major,year,tags\njohn@college.edu,johndoe,John Doe,user,Computer Science,2028,tech;sports\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);

    // Get preview
    const res = await fetch('/api/admin/bulk/users/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ csv: text }),
    });
    if (res.ok) {
      const data = await res.json();
      setImportPreview(data);
    } else {
      alert('Failed to generate preview');
    }
  }

  async function handleImportSubmit() {
    if (!csvText) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/bulk/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csv: csvText }),
      });
      if (res.ok) {
        const job = await res.json();
        setImportJobId(job.id);
        setImportProgress(0);
      } else {
        alert('Failed to start import');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ username: '', display_name: '', email: '', admin_roles: 'member' });
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: form.display_name,
          email: form.email,
          admin_roles: form.admin_roles,
        }),
      });
      if (res.ok) {
        setEditUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this user?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchUsers();
      else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleAwardBadge() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${awardBadgeUser.id}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...badgeForm,
          isCustom: true,
          earnedAt: new Date(),
        }),
      });
      if (res.ok) {
        setAwardBadgeUser(null);
        setBadgeForm({ name: '', description: '', icon: 'Award' });
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to award badge');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlock(id) {
    if (!confirm('Unlock this user account?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}/unlock`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) alert('Account unlocked successfully');
      else alert('Failed to unlock');
    } catch (e) {
      console.error(e);
      alert('Error unlocking account');
    }
  }

  async function handleResetPassword(id) {
    const newPassword = prompt('Enter new password (min 8 chars):');
    if (!newPassword || newPassword.length < 8) return alert('Invalid password');
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) alert('Password reset successfully');
      else alert('Failed to reset password');
    } catch (e) {
      console.error(e);
      alert('Error resetting password');
    }
  }

  function openEdit(user) {
    setEditUser(user);
    setForm({
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      admin_roles: user.admin_roles,
    });
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2>User Management</h2>
        <button onClick={() => setShowAddModal(true)}>+ Add User</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Username', 'Display Name', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
              <th
                key={h}
                style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '8px' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: '8px' }}>{user.username}</td>
              <td style={{ padding: '8px' }}>{user.display_name}</td>
              <td style={{ padding: '8px' }}>{user.email}</td>
              <td style={{ padding: '8px' }}>{user.admin_roles}</td>
              <td style={{ padding: '8px' }}>
                {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '-'}
              </td>
              <td style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                <button onClick={() => openEdit(user)}>Edit</button>
                <button onClick={() => handleDeactivate(user.id)}>Deactivate</button>
                <button onClick={() => handleUnlock(user.id)}>Unlock</button>
                <button onClick={() => handleResetPassword(user.id)}>Reset Password</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(showAddModal || editUser) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              minWidth: '320px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3>{editUser ? 'Edit User' : 'Add User'}</h3>
            {!editUser && (
              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            )}
            <input
              placeholder="Display Name"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <select
              value={form.admin_roles}
              onChange={(e) => setForm((f) => ({ ...f, admin_roles: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={editUser ? handleUpdate : handleCreate}>
                {editUser ? 'Save' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {timelineUser && (
        <UserTimelineModal user={timelineUser} onClose={() => setTimelineUser(null)} />
      )}
    </div>
  );
}
