# Environment Configuration

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```

## Deployment

For production deployment, set the environment variable:

```bash
VITE_API_BASE_URL=https://your-production-api.com
```

## Notes

- The app uses `http://localhost:8080` as the default if no environment variable is set
- All API calls are configured to use `VITE_API_BASE_URL`
- Remember to restart the dev server after changing `.env` files
