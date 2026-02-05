# TripGo Backend Setup

## Environment Configuration

1. Copy `application.yml.example` to `application.yml`
2. Fill in the required environment variables:

### Required Environment Variables:
```bash
# Database
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (Gmail)
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# JWT
JWT_SECRET=your_jwt_secret_key

# URLs (optional, defaults provided)
FRONTEND_URL=http://localhost:5174
BACKEND_URL=http://localhost:8080
```

### Security Note:
- Never commit `application.yml` or `application.properties` to version control
- Use environment variables for sensitive data
- Keep your OAuth secrets and database credentials secure