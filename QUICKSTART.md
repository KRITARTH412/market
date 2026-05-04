# PropMind AI - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js 18+
- MongoDB running locally or Atlas connection string
- OpenAI API key

## 1. Install Dependencies

```bash
npm install
```

## 2. Minimum Environment Setup

Create `.env` file with these minimum required variables:

```bash
# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/propmind-ai

# JWT (use any random strings for development)
JWT_ACCESS_SECRET=dev-access-secret-min-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-min-32-characters-long

# OpenAI (REQUIRED - get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-actual-openai-api-key

# Pinecone (REQUIRED for document search)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=propmind-vectors

# Cloudinary (REQUIRED for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (optional for development - emails will fail silently)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=PropMind AI <noreply@propmind.ai>

# Razorpay (optional for development)
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=test_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret
```

## 3. Start MongoDB

```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start your local MongoDB service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

## 4. Seed Database

```bash
npm run seed
```

This creates demo data including:
- Organization: "Demo Real Estate"
- Users with different roles
- Sample projects and leads

**Login Credentials:**
```
Owner:  owner@demo.com  / Password123
Admin:  admin@demo.com  / Password123
Agent1: agent1@demo.com / Password123
Agent2: agent2@demo.com / Password123
```

## 5. Start Server

```bash
npm run server
```

Server starts at: http://localhost:5000

## 6. Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@demo.com",
    "password": "Password123"
  }'
```

Copy the `accessToken` from the response.

### Get Your Profile
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Projects
```bash
curl http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Leads
```bash
curl http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 7. Test AI Chat (Optional - requires OpenAI key)

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about available properties in Mumbai"
  }'
```

## 8. Test Widget (Optional)

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>PropMind AI Widget Test</h1>
  
  <!-- Replace YOUR_API_KEY with the key from seed output -->
  <script 
    src="http://localhost:5000/widget.js" 
    data-api-key="YOUR_API_KEY"
    data-api-url="http://localhost:5000/api/widget">
  </script>
</body>
</html>
```

Open in browser and click the chat button in bottom-right corner.

## Common Issues

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh
# or
mongo

# If not running, start it
docker start mongodb
# or
brew services start mongodb-community
```

### OpenAI API Error
- Verify your API key is correct
- Check you have credits in your OpenAI account
- Ensure no extra spaces in the .env file

### Port Already in Use
```bash
# Change PORT in .env to a different number
PORT=5001
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Explore the API**: Check `README.md` for all available endpoints
2. **Upload Documents**: Test document upload and vectorization
3. **Create Leads**: Add leads and test the CRM features
4. **Test Analytics**: View dashboard statistics
5. **Build Frontend**: Start building the React frontend

## API Documentation

See `README.md` for complete API documentation with all endpoints.

## Full Setup Guide

For production setup with all services configured, see `SETUP.md`.

## Need Help?

- Check logs for errors
- Verify all environment variables are set
- Ensure all required services are running
- Review the error messages carefully

Happy coding! 🚀
