import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  RefreshCw,
  Users,
  UserCheck
} from 'lucide-react';

export default function AdminRoleRequests({ onNavigateHome }) {
  // Navigation tabs: 'roleRequests' | 'users'
  const [adminTab, setAdminTab] = useState('roleRequests');

  // Role Requests state
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'

  // User Accounts state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all' | 'unverified' | 'verified'
  const [userSearch, setUserSearch] = useState('');

  // Modal confirm state for role requests
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approved' | 'rejected'
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    if (adminTab === 'roleRequests') {
      fetchRequests(page, statusFilter);
    } else {
      fetchUsers(userStatusFilter, userSearch);
    }
  }, [adminTab, page, statusFilter, userStatusFilter]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRequests = async (currentPage, filter) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/roles/requests', {
        params: { page: currentPage, limit: 5, status: filter },
      });
      setRequests(res.data.requests || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Fetch requests error:', err);
      try {
        const fallbackRes = await axios.get('/api/roles/requests', {
          params: { page: currentPage, limit: 5, status: filter },
        });
        setRequests(fallbackRes.data.requests || []);
        setTotalPages(fallbackRes.data.totalPages || 1);
        setTotalCount(fallbackRes.data.total || 0);
      } catch (fbErr) {
        showToast('error', fbErr.response?.data?.message || 'Failed to fetch organizer role requests.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (filter, search) => {
    try {
      setUsersLoading(true);
      const res = await axios.get('/api/admin/users', {
        params: { status: filter, search },
      });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      showToast('error', err.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleUserVerification = async (targetUser, shouldVerify) => {
    try {
      setIsProcessing(true);
      const res = await axios.patch(`/api/admin/users/${targetUser._id}/verify`, {
        isVerified: shouldVerify,
      });
      showToast('success', res.data.message || `User verification updated!`);
      fetchUsers(userStatusFilter, userSearch);
    } catch (err) {
      console.error('Toggle verification error:', err);
      showToast('error', err.response?.data?.message || 'Failed to update user verification.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenConfirmModal = (req, type) => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminNote('');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setIsProcessing(true);
      const endpoint = `/api/admin/roles/requests/${selectedRequest._id}`;
      const payload = { status: actionType, adminNote };

      let res;
      try {
        res = await axios.patch(endpoint, payload);
      } catch (err) {
        res = await axios.patch(`/api/roles/requests/${selectedRequest._id}`, payload);
      }

      setIsProcessing(false);
      setSelectedRequest(null);

      showToast(
        'success',
        actionType === 'approved'
          ? `🎉 Approved! ${selectedRequest.userId?.name || 'User'} has been promoted to Event Organizer.`
          : `Role request rejected for ${selectedRequest.userId?.name || 'applicant'}.`
      );

      fetchRequests(page, statusFilter);
    } catch (err) {
      setIsProcessing(false);
      showToast('error', err.response?.data?.message || 'Failed to update role request status.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: '700', fontSize: '14px' }}>
            <Shield size={18} /> Admin Control Center
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
            {adminTab === 'roleRequests' ? 'Organizer Role Requests' : 'User Accounts & Verification'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {adminTab === 'roleRequests'
              ? 'Review and approve organizer applications so users can publish events'
              : 'Verify real users, view active registrations, and manage platform accounts'}
          </p>
        </div>
        {onNavigateHome && (
          <button className="btn-secondary" onClick={onNavigateHome}>
            ← Back to App
          </button>
        )}
      </div>

      {/* Main Mode Switcher Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className={adminTab === 'roleRequests' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setAdminTab('roleRequests')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Shield size={16} /> Organizer Approvals
        </button>
        <button
          className={adminTab === 'users' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setAdminTab('users')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Users size={16} /> User Accounts & Verification
        </button>
      </div>

      {/* Result Toast Notification */}
      {toast && (
        <div
          className="animate-fade-in"
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '600',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: ROLE REQUESTS                                  */}
      {/* ========================================================= */}
      {adminTab === 'roleRequests' && (
        <>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            {['pending', 'approved', 'rejected', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={statusFilter === tab ? 'btn-primary' : 'btn-secondary'}
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  textTransform: 'capitalize',
                  borderRadius: '20px',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List of Role Requests */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading organizer role requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Shield size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3>No {statusFilter !== 'all' ? statusFilter : ''} organizer requests found.</h3>
              <p style={{ fontSize: '14px', marginTop: '6px' }}>
                When residents request organizer privileges to publish events, their applications appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderLeft: `4px solid ${
                      req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>{req.userId?.name || 'Unknown User'}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            background:
                              req.status === 'approved'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : req.status === 'rejected'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                            color:
                              req.status === 'approved' ? '#34d399' : req.status === 'rejected' ? '#f87171' : '#fbbf24',
                          }}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={13} /> {req.userId?.email}
                        </span>
                        {req.userId?.city && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} /> {req.userId.city}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> Requested {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleOpenConfirmModal(req, 'approved')}
                          style={{ background: '#10b981', padding: '6px 12px', fontSize: '13px' }}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleOpenConfirmModal(req, 'rejected')}
                          style={{ color: '#ef4444', borderColor: '#ef4444', padding: '6px 12px', fontSize: '13px' }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Application Note:
                    </div>
                    {req.message || 'No additional details provided.'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600' }}>
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: USER ACCOUNTS & VERIFICATION                   */}
      {/* ========================================================= */}
      {adminTab === 'users' && (
        <>
          {/* User Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['all', 'unverified', 'verified'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setUserStatusFilter(tab)}
                  className={userStatusFilter === tab ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    fontSize: '13px',
                    padding: '6px 14px',
                    textTransform: 'capitalize',
                    borderRadius: '20px',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search by name, email, city..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userStatusFilter, userSearch)}
                className="form-control"
                style={{ width: '240px', padding: '6px 12px', fontSize: '13px' }}
              />
              <button
                className="btn-secondary"
                onClick={() => fetchUsers(userStatusFilter, userSearch)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Search
              </button>
            </div>
          </div>

          {/* User Accounts List */}
          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              <p>Loading registered user accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3>No users found.</h3>
              <p style={{ fontSize: '14px', marginTop: '6px' }}>
                When users register on the website, they will appear here for verification.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map((u) => (
                <div
                  key={u._id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    borderLeft: `4px solid ${u.isVerified ? '#10b981' : '#f59e0b'}`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px' }}>{u.name}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#818cf8',
                        }}
                      >
                        {u.role}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: u.isVerified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: u.isVerified ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {u.isVerified ? '✓ Verified' : '⚠ Unverified'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {u.email}
                      </span>
                      {u.city && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {u.city}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Registered: {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Admin Verification Action */}
                  <div>
                    {!u.isVerified ? (
                      <button
                        className="btn-primary"
                        onClick={() => handleToggleUserVerification(u, true)}
                        disabled={isProcessing}
                        style={{ background: '#10b981', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <UserCheck size={14} /> Verify Account
                      </button>
                    ) : (
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleUserVerification(u, false)}
                        disabled={isProcessing}
                        style={{ padding: '6px 14px', fontSize: '13px', opacity: 0.7 }}
                      >
                        Revoke Verification
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Role Request Confirmation Modal */}
      {selectedRequest && (
        <div className="modal-overlay animate-fade-in" onClick={() => setSelectedRequest(null)}>
          <div
            className="card animate-fade-in"
            style={{ maxWidth: '480px', width: '100%', padding: '28px', borderRadius: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              Confirm Role {actionType === 'approved' ? 'Approval' : 'Rejection'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Are you sure you want to <strong>{actionType}</strong> the organizer request for{' '}
              <strong>{selectedRequest.userId?.name}</strong> ({selectedRequest.userId?.email})?
            </p>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Admin Note / Reason (Optional)</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="E.g., Credentials verified via phone call."
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn-primary"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: actionType === 'approved' ? 'linear-gradient(135deg, #10b981, #059669)' : '#ef4444',
                }}
              >
                {isProcessing ? 'Processing...' : `Confirm ${actionType === 'approved' ? 'Approve' : 'Reject'}`}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setSelectedRequest(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
