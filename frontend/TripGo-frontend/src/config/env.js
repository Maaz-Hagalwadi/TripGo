const required = ['VITE_API_BASE_URL'];

const missing = required.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    `Set them in .env (local) or in your Vercel project settings (production).`
  );
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
