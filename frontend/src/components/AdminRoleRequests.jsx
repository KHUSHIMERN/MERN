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
<<<<<<< HEAD
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
=======
  Flag,
  AlertTriangle,
  Check,
  Ban,
  ShieldCheck,
  EyeOff,
  Filter,
} from 'lucide-react';

export default function AdminRoleRequests({ onNavigateHome }) {
  // Main Navigation Tabs
  const [activeAdminTab, setActiveAdminTab] = useState('reports'); // 'reports' | 'verification' | 'roles'

  // Toast feedback state
  const [toast, setToast] = useState(null);
>>>>>>> DEV-AMRITA

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

  // =========================================================================
  // TAB 1: Organizer Role Requests State
  // =========================================================================
  const [requests, setRequests] = useState([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [rolePage, setRolePage] = useState(1);
  const [roleTotalPages, setRoleTotalPages] = useState(1);
  const [roleTotalCount, setRoleTotalCount] = useState(0);
  const [roleStatusFilter, setRoleStatusFilter] = useState('pending');

  const [selectedRoleRequest, setSelectedRoleRequest] = useState(null);
  const [roleActionType, setRoleActionType] = useState(null);
  const [roleAdminNote, setRoleAdminNote] = useState('');
  const [isProcessingRole, setIsProcessingRole] = useState(false);

  const fetchRoleRequests = async (currentPage, filter) => {
    try {
      setRoleLoading(true);
      const res = await axios.get('/api/admin/roles/requests', {
        params: { page: currentPage, limit: 5, status: filter },
      });
      setRequests(res.data.requests || []);
      setRoleTotalPages(res.data.totalPages || 1);
      setRoleTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Fetch requests error:', err);
      try {
        const fallbackRes = await axios.get('/api/roles/requests', {
          params: { page: currentPage, limit: 5, status: filter },
        });
        setRequests(fallbackRes.data.requests || []);
        setRoleTotalPages(fallbackRes.data.totalPages || 1);
        setRoleTotalCount(fallbackRes.data.total || 0);
      } catch (fbErr) {
        showToast('error', fbErr.response?.data?.message || 'Failed to fetch organizer role requests.');
      }
    } finally {
      setRoleLoading(false);
    }
  };

  const handleConfirmRoleAction = async () => {
    if (!selectedRoleRequest || !roleActionType) return;
    try {
<<<<<<< HEAD
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

=======
      setIsProcessingRole(true);
      const endpoint = `/api/admin/roles/requests/${selectedRoleRequest._id}`;
      const payload = { status: roleActionType, adminNote: roleAdminNote };
      try {
        await axios.patch(endpoint, payload);
      } catch {
        await axios.patch(`/api/roles/requests/${selectedRoleRequest._id}`, payload);
      }
      setIsProcessingRole(false);
      setSelectedRoleRequest(null);
>>>>>>> DEV-AMRITA
      showToast(
        'success',
        roleActionType === 'approved'
          ? `Approved! ${selectedRoleRequest.userId?.name || 'User'} promoted to Event Organizer.`
          : `Role request rejected for ${selectedRoleRequest.userId?.name || 'applicant'}.`
      );
<<<<<<< HEAD

      fetchRequests(page, statusFilter);
=======
      fetchRoleRequests(rolePage, roleStatusFilter);
>>>>>>> DEV-AMRITA
    } catch (err) {
      setIsProcessingRole(false);
      showToast('error', err.response?.data?.message || 'Failed to update role request status.');
    }
  };

  // =========================================================================
  // TAB 2: Reported Events & Moderation State (Feature 9)
  // =========================================================================
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsFilter, setReportsFilter] = useState('pending'); // 'pending' | 'action_taken' | 'dismissed' | 'all'
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsTotal, setReportsTotal] = useState(0);

  const [selectedReport, setSelectedReport] = useState(null);
  const [reportAction, setReportAction] = useState(null); // 'dismiss' | 'unverify' | 'unpublish'
  const [reportAdminNote, setReportAdminNote] = useState('');
  const [isProcessingReport, setIsProcessingReport] = useState(false);

  const fetchReports = async (page = 1, status = reportsFilter) => {
    try {
      setReportsLoading(true);
      const res = await axios.get('/api/admin/reports', {
        params: { page, limit: 6, status },
      });
      if (res.data?.success) {
        setReports(res.data.reports || []);
        setReportsTotalPages(res.data.totalPages || 1);
        setReportsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      showToast('error', err.response?.data?.message || 'Failed to load event safety reports.');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleOpenReportModal = (report, action) => {
    setSelectedReport(report);
    setReportAction(action);
    setReportAdminNote('');
  };

  const handleConfirmReportAction = async () => {
    if (!selectedReport || !reportAction) return;
    try {
      setIsProcessingReport(true);
      const payload = {
        action: reportAction,
        status: reportAction === 'dismiss' ? 'dismissed' : 'action_taken',
        adminNotes: reportAdminNote.trim(),
      };
      const res = await axios.patch(`/api/admin/reports/${selectedReport._id || selectedReport.id}`, payload);
      if (res.data?.success) {
        showToast('success', res.data.message || 'Report resolved successfully.');
        setSelectedReport(null);
        fetchReports(reportsPage, reportsFilter);
      }
    } catch (err) {
      console.error('Error resolving report:', err);
      showToast('error', err.response?.data?.message || 'Failed to resolve report.');
    } finally {
      setIsProcessingReport(false);
    }
  };

  // =========================================================================
  // TAB 3: Event Verification Approvals State (Feature 9)
  // =========================================================================
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  const fetchPendingEvents = async () => {
    try {
      setPendingLoading(true);
      const res = await axios.get('/api/admin/events/pending');
      if (res.data?.success) {
        setPendingEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('Fetch pending events error:', err);
      showToast('error', 'Failed to fetch pending event approvals.');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleVerifyEvent = async (eventId, verificationStatus, title) => {
    try {
      const res = await axios.patch(`/api/admin/events/${eventId}/verify`, {
        verificationStatus,
        adminNotes: `Status updated by Admin to ${verificationStatus}`,
      });
      if (res.data?.success) {
        showToast(
          'success',
          verificationStatus === 'verified'
            ? `Verified! '${title}' is now an approved community event.`
            : `Event '${title}' rejected and unpublished.`
        );
        fetchPendingEvents();
      }
    } catch (err) {
      console.error('Verify event error:', err);
      showToast('error', err.response?.data?.message || 'Failed to update event verification.');
    }
  };

  // Initial tab loading
  useEffect(() => {
    if (activeAdminTab === 'roles') {
      fetchRoleRequests(rolePage, roleStatusFilter);
    } else if (activeAdminTab === 'reports') {
      fetchReports(reportsPage, reportsFilter);
    } else if (activeAdminTab === 'verification') {
      fetchPendingEvents();
    }
  }, [activeAdminTab, rolePage, roleStatusFilter, reportsPage, reportsFilter]);

  const getReasonBadgeStyle = (reason) => {
    switch (reason) {
      case 'spam':
        return { background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' };
      case 'safety_concern':
        return { background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)' };
      case 'scam':
        return { background: 'rgba(225, 29, 72, 0.25)', color: '#fb7185', border: '1px solid rgba(225, 29, 72, 0.5)' };
      case 'inappropriate':
        return { background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' };
      default:
        return { background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' };
    }
  };

  return (
<<<<<<< HEAD
    <div className="container" style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
=======
    <div className="container" style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px', color: '#f8fafc' }}>
>>>>>>> DEV-AMRITA
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: '700', fontSize: '14px' }}>
<<<<<<< HEAD
            <Shield size={18} /> Admin Control Center
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
            {adminTab === 'roleRequests' ? 'Organizer Role Requests' : 'User Accounts & Verification'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {adminTab === 'roleRequests'
              ? 'Review and approve organizer applications so users can publish events'
              : 'Verify real users, view active registrations, and manage platform accounts'}
=======
            <Shield size={18} /> Admin Safety & Moderation Hub
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px', color: '#ffffff' }}>
            Platform Administration
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Review user-reported events, approve pending event verifications, and manage organizer credentials.
>>>>>>> DEV-AMRITA
          </p>
        </div>
        {onNavigateHome && (
          <button className="btn-secondary" onClick={onNavigateHome} style={{ border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            Back to App
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

<<<<<<< HEAD
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
=======
      {/* Top Level Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '6px',
          background: 'rgba(15, 23, 42, 0.7)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveAdminTab('reports')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            background: activeAdminTab === 'reports' ? '#ef4444' : 'transparent',
            color: activeAdminTab === 'reports' ? '#ffffff' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Flag size={16} /> Reported Events & Safety
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('verification')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            background: activeAdminTab === 'verification' ? '#6366f1' : 'transparent',
            color: activeAdminTab === 'verification' ? '#ffffff' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldCheck size={16} /> Event Verification Queue {pendingEvents.length > 0 && `(${pendingEvents.length})`}
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('roles')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            background: activeAdminTab === 'roles' ? '#10b981' : 'transparent',
            color: activeAdminTab === 'roles' ? '#ffffff' : '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <User size={16} /> Organizer Role Requests
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB CONTENT 1: REPORTED EVENTS & SAFETY (Feature 9)                */}
      {/* =================================================================== */}
      {activeAdminTab === 'reports' && (
        <div>
          {/* Subfilter status buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { id: 'pending', label: 'Pending Reports' },
              { id: 'action_taken', label: 'Action Taken' },
              { id: 'dismissed', label: 'Dismissed' },
              { id: 'all', label: 'All Reports' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setReportsFilter(f.id);
                  setReportsPage(1);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  background: reportsFilter === f.id ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  borderColor: reportsFilter === f.id ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                  color: reportsFilter === f.id ? '#fca5a5' : '#94a3b8',
                }}
              >
                {f.label} {reportsFilter === f.id && `(${reportsTotal})`}
>>>>>>> DEV-AMRITA
              </button>
            ))}
          </div>

<<<<<<< HEAD
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
=======
          {reportsLoading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <p>Loading safety reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#1e293b' }}>
              <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No {reportsFilter} reports found</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                There are no event safety reports matching this criteria.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reports.map((rep) => {
                const repId = rep._id || rep.id;
                const badgeStyle = getReasonBadgeStyle(rep.reason);
                return (
                  <div
                    key={repId}
                    className="card"
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `4px solid ${
                        rep.status === 'pending'
                          ? '#ef4444'
                          : rep.status === 'action_taken'
                          ? '#f59e0b'
                          : '#64748b'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              ...badgeStyle,
                            }}
                          >
                            {rep.reason?.replace('_', ' ')}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background:
                                rep.status === 'pending'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : rep.status === 'action_taken'
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(100, 116, 139, 0.2)',
                              color:
                                rep.status === 'pending'
                                  ? '#f87171'
                                  : rep.status === 'action_taken'
                                  ? '#fbbf24'
                                  : '#94a3b8',
                            }}
                          >
                            {rep.status?.toUpperCase()}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0', color: '#f8fafc' }}>
                          {rep.eventTitle || `Event ID: ${rep.eventId}`}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                          Reported by <strong style={{ color: '#cbd5e1' }}>{rep.reporterName || 'Resident'}</strong>
                          {rep.reporterEmail && ` (${rep.reporterEmail})`}
                        </p>
                      </div>

                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(rep.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Report details / explanation */}
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        marginBottom: '14px',
                        fontSize: '13px',
                        color: '#cbd5e1',
                      }}
                    >
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>Reporter's Statement: </span>
                      "{rep.details || 'No additional statement provided.'}"
                    </div>

                    {/* Admin notes if reviewed */}
                    {rep.adminNotes && (
                      <div
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          borderLeft: '3px solid #6366f1',
                          borderRadius: '4px',
                          marginBottom: '12px',
                          fontSize: '12px',
                          color: '#c7d2fe',
                        }}
                      >
                        <strong>Admin Note:</strong> {rep.adminNotes}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Action Taken: <strong style={{ color: '#cbd5e1' }}>{rep.actionTaken || 'None'}</strong>
                      </span>

                      {rep.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(rep, 'dismiss')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={14} /> Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(rep, 'unverify')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: 'rgba(234, 179, 8, 0.15)',
                              border: '1px solid #eab308',
                              color: '#facc15',
                              cursor: 'pointer',
                            }}
                          >
                            <Ban size={14} /> Unverify Event
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(rep, 'unpublish')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#ef4444',
                              border: 'none',
                              color: '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            <EyeOff size={14} /> Unpublish Event
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {reportsTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
>>>>>>> DEV-AMRITA
              <button
                className="btn-secondary"
                disabled={reportsPage <= 1}
                onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Page {reportsPage} of {reportsTotalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={reportsPage >= reportsTotalPages}
                onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB CONTENT 2: EVENT VERIFICATION QUEUE (Feature 9)                */}
      {/* =================================================================== */}
      {activeAdminTab === 'verification' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: '#f8fafc' }}>
              Pending Event Approvals
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Events created by newly registered organizers requiring administrative review before public verification.
            </p>
          </div>

          {pendingLoading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <p>Scanning verification queue...</p>
            </div>
          ) : pendingEvents.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#1e293b' }}>
              <ShieldCheck size={38} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Queue is Clear</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                All community events are currently verified. No pending approval requests.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingEvents.map((evt) => {
                const evtId = evt._id || evt.id;
                return (
                  <div
                    key={evtId}
                    className="card"
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: '4px solid #818cf8',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: '#a5b4fc',
                            }}
                          >
                            {evt.category}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#fbbf24',
                            }}
                          >
                            VERIFICATION PENDING
                          </span>
                        </div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', margin: '4px 0' }}>
                          {evt.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 10px' }}>
                          {evt.description}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#cbd5e1' }}>
                          <span>
                            📍 {(typeof evt.location === 'object' && evt.location !== null ? evt.location.placeName : evt.location) || evt.city}
                          </span>
                          <span>📅 {evt.date || new Date(evt.startDate).toLocaleDateString()}</span>
                          <span>👥 Capacity: {evt.capacity || 100}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
                        <button
                          type="button"
                          onClick={() => handleVerifyEvent(evtId, 'verified', evt.title)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <ShieldCheck size={16} /> Approve & Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyEvent(evtId, 'rejected', evt.title)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: 'transparent',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            cursor: 'pointer',
                          }}
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB CONTENT 3: ORGANIZER ROLE REQUESTS (Existing)                  */}
      {/* =================================================================== */}
      {activeAdminTab === 'roles' && (
        <div>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
            {['pending', 'approved', 'rejected', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setRoleStatusFilter(tab);
                  setRolePage(1);
                }}
                className="btn-secondary"
                style={{
                  textTransform: 'capitalize',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  background: roleStatusFilter === tab ? '#6366f1' : 'transparent',
                  color: roleStatusFilter === tab ? '#fff' : '#94a3b8',
                  border: roleStatusFilter === tab ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                {tab} Requests {roleStatusFilter === tab && `(${roleTotalCount})`}
              </button>
            ))}
          </div>

          {/* Main Request List */}
          {roleLoading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <p>Loading organizer applications...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#1e293b' }}>
              <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>No {roleStatusFilter} requests found</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                There are currently no organizer role applications matching this status.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '14px',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
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
                        <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px', color: '#f8fafc' }}>
                          {req.userId?.name || 'Applicant'}
                        </h3>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8' }}>
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

                  {/* Application Note */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: '700' }}>
                      <MessageSquare size={12} /> APPLICANT NOTE
                    </div>
                    <p style={{ color: '#cbd5e1', margin: 0 }}>"{req.message || 'No description provided.'}"</p>
                  </div>

                  {/* Footer info & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Submitted on {new Date(req.createdAt).toLocaleDateString()}
                    </span>

                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            setSelectedRoleRequest(req);
                            setRoleActionType('approved');
                            setRoleAdminNote('');
                          }}
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '13px', padding: '8px 16px' }}
                        >
                          <CheckCircle size={15} /> Approve
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedRoleRequest(req);
                            setRoleActionType('rejected');
                            setRoleAdminNote('');
                          }}
                          style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '13px', padding: '8px 16px' }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Reviewed by Admin {req.reviewedBy?.name ? `(${req.reviewedBy.name})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {roleTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button
                className="btn-secondary"
                disabled={rolePage <= 1}
                onClick={() => setRolePage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                Page {rolePage} of {roleTotalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={rolePage >= roleTotalPages}
                onClick={() => setRolePage((p) => Math.min(roleTotalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: Role Confirmation Modal                                   */}
      {/* =================================================================== */}
      {selectedRoleRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRoleRequest(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '480px', background: '#0f172a', color: '#f8fafc', padding: '24px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Confirm Role {roleActionType === 'approved' ? 'Approval' : 'Rejection'}
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
              Are you sure you want to <strong>{roleActionType}</strong> organizer credentials for{' '}
              <strong style={{ color: '#f8fafc' }}>{selectedRoleRequest.userId?.name}</strong>?
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Admin Note (Optional)
              </label>
              <input
                type="text"
                value={roleAdminNote}
                onChange={(e) => setRoleAdminNote(e.target.value)}
                placeholder="E.g., Verified local community affiliations."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedRoleRequest(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmRoleAction}
                disabled={isProcessingRole}
                style={{
                  background: roleActionType === 'approved' ? '#10b981' : '#ef4444',
                }}
              >
                {isProcessingRole ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: Report Moderation Modal                                   */}
      {/* =================================================================== */}
      {selectedReport && (
        <div className="modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '480px', background: '#0f172a', color: '#f8fafc', padding: '24px', borderRadius: '14px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
              {reportAction === 'dismiss'
                ? 'Dismiss Safety Report'
                : reportAction === 'unverify'
                ? 'Unverify Community Event'
                : 'Unpublish / Suspend Event'}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>
              {reportAction === 'dismiss'
                ? `Dismiss report on '${selectedReport.eventTitle}' as not violating community standards.`
                : reportAction === 'unverify'
                ? `Remove verification badge from '${selectedReport.eventTitle}'.`
                : `Suspend '${selectedReport.eventTitle}' and remove it from public discovery.`}
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Moderation Notes / Audit Reason
              </label>
              <textarea
                rows={3}
                value={reportAdminNote}
                onChange={(e) => setReportAdminNote(e.target.value)}
                placeholder="Explain the moderation decision for audit logs..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedReport(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmReportAction}
                disabled={isProcessingReport}
                style={{
                  background: reportAction === 'dismiss' ? '#6366f1' : '#ef4444',
                }}
              >
                {isProcessingReport ? 'Processing...' : 'Confirm Moderation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
