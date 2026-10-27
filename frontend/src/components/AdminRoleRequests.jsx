import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, MessageSquare, User, Mail, Phone, MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminRoleRequests({ onNavigateHome }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'

  // Modal confirm state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approved' | 'rejected'
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => {
    fetchRequests(page, statusFilter);
  }, [page, statusFilter]);

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
      // Fallback API path if mounted under /api/roles/requests
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

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
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
        // Fallback to /api/roles/requests/:id
        res = await axios.patch(`/api/roles/requests/${selectedRequest._id}`, payload);
      }

      setIsProcessing(false);
      setSelectedRequest(null);

      // Immediate UI Feedback Toast
      showToast(
        'success',
        actionType === 'approved'
          ? `🎉 Approved! ${selectedRequest.userId?.name || 'User'} has been promoted to Event Organizer.`
          : `Role request rejected for ${selectedRequest.userId?.name || 'applicant'}.`
      );

      // Refresh list without full page reload
      fetchRequests(page, statusFilter);
    } catch (err) {
      setIsProcessing(false);
      showToast('error', err.response?.data?.message || 'Failed to update role request status.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: '700', fontSize: '14px' }}>
            <Shield size={18} /> Admin Dashboard
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Organizer Role Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Review, approve, or reject tier 2-4 city community organizer applications
          </p>
        </div>
        {onNavigateHome && (
          <button className="btn-secondary" onClick={onNavigateHome}>
            ← Back to App
          </button>
        )}
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className="btn-secondary"
            style={{
              textTransform: 'capitalize',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              background: statusFilter === tab ? '#6366f1' : 'transparent',
              color: statusFilter === tab ? '#fff' : 'var(--text-muted)',
              border: statusFilter === tab ? 'none' : '1px solid var(--border-color)',
            }}
          >
            {tab} Requests {statusFilter === tab && `(${totalCount})`}
          </button>
        ))}
      </div>

      {/* Main Request List */}
      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '10px' }} />
          <p>Loading organizer applications...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Clock size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>No {statusFilter} requests found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            There are currently no organizer role applications matching this status.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req) => (
            <div
              key={req._id}
              className="card animate-fade-in"
              style={{
                padding: '24px',
                borderRadius: '14px',
                borderLeft: `4px solid ${
                  req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '18px',
                    }}
                  >
                    {req.userId?.name ? req.userId.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px' }}>
                      {req.userId?.name || 'Applicant'}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {req.userId?.email}
                      </span>
                      {req.userId?.contact && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {req.userId.contact}
                        </span>
                      )}
                      {req.userId?.city && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {req.userId.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    background:
                      req.status === 'approved'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : req.status === 'rejected'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color:
                      req.status === 'approved'
                        ? '#34d399'
                        : req.status === 'rejected'
                        ? '#f87171'
                        : '#fbbf24',
                  }}
                >
                  {req.status}
                </span>
              </div>

              {/* Application Message */}
              <div
                style={{
                  background: 'var(--input-bg)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '4px', fontSize: '11px', fontWeight: '700' }}>
                  <MessageSquare size={12} /> APPLICANT NOTE
                </div>
                <p style={{ color: 'var(--text-main)' }}>"{req.message || 'No description provided.'}"</p>
              </div>

              {/* Footer info & Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Submitted on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {req.status === 'pending' ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleOpenConfirmModal(req, 'approved')}
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '13px', padding: '8px 16px' }}
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleOpenConfirmModal(req, 'rejected')}
                      style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '13px', padding: '8px 16px' }}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', italic: 'true' }}>
                    Reviewed by Admin {req.reviewedBy?.name ? `(${req.reviewedBy.name})` : ''}
                  </span>
                )}
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

      {/* Action Confirmation Modal Popup */}
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
                  justify: 'center',
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
