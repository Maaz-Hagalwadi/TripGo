import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TripGoIcon from '../assets/icons/TripGoIcon';
import { API_BASE_URL } from '../config/env';

const AdminOperatorAction = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processAction = async () => {
      const action = searchParams.get('action') || searchParams.get('status');
      const operatorId = searchParams.get('operatorId') || searchParams.get('operator');

      if (!action || !operatorId) {
        setStatus('error');
        setMessage('Invalid request parameters');
        return;
      }

      if (action === 'approved' || action === 'rejected') {
        setStatus('success');
        setMessage(`Operator ${action} successfully!`);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin/operator/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorId }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage(action === 'approve' ? 'Operator approved successfully!' : 'Operator rejected successfully!');
        } else {
          setStatus('error');
          setMessage('Failed to process request');
        }
      } catch {
        setStatus('error');
        setMessage('Network error occurred');
      }
    };

    processAction();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-white/10 text-center">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#002046] flex items-center justify-center shadow-lg">
              <TripGoIcon className="w-7 h-6 text-white" />
            </div>
          </div>

          {status === 'loading' && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-[#002046]/[0.08] flex items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#002046]/20 border-t-[#002046]" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Processing Request</h2>
              <p className="mt-2 text-sm text-slate-500">Please wait while we process the operator action.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Success</h2>
              <p className="mt-2 text-sm text-slate-500">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-red-50 ring-1 ring-red-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-red-500">cancel</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Error</h2>
              <p className="mt-2 text-sm text-slate-500">{message}</p>
            </>
          )}

          <p className="mt-6 text-xs text-slate-400">TripGo Admin · Operator Management</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOperatorAction;
