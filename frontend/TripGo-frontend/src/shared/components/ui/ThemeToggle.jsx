import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
        isDark
          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-primary/50'
          : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-primary/50'
      }`}
    >
      <span className="material-symbols-outlined text-base">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
