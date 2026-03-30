import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants/routes';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-deep-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-extrabold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="bg-primary text-black px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
