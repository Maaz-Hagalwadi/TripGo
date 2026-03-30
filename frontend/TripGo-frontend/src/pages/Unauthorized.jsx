import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-deep-black flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-red-400 text-7xl mb-4 block">lock</span>
        <h1 className="text-3xl font-extrabold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6">You don't have permission to view this page.</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary text-black px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
