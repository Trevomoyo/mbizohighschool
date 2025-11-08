# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the Mbizo High School Management System.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" or "Sign Up"
3. Create your account with email and password
4. Verify your email address

## Step 2: Create a New Cluster

1. After logging in, click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select your preferred cloud provider and region (choose closest to Zimbabwe)
4. Give your cluster a name (e.g., "mbizo-school-cluster")
5. Click "Create Cluster"

## Step 3: Configure Database Access

### Create Database User
1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Enter a username (e.g., "mbizo-admin")
5. Generate a secure password or create your own
6. **IMPORTANT**: Save these credentials securely
7. Under "Database User Privileges", select "Read and write to any database"
8. Click "Add User"

### Configure Network Access
1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production, add only your server's IP address
5. Click "Confirm"

## Step 4: Get Connection String

1. Go back to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as the driver
5. Copy the connection string

It will look like this:
```
mongodb+srv://<username>:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

## Step 5: Update Your .env File

1. Open your `.env` file
2. Replace the MongoDB URI with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://mbizo-admin:YOUR_PASSWORD@cluster0.abc123.mongodb.net/mbizo-school?retryWrites=true&w=majority
```

**Replace:**
- `mbizo-admin` with your actual username
- `YOUR_PASSWORD` with your actual password
- `cluster0.abc123.mongodb.net` with your actual cluster URL
- `mbizo-school` is the database name (you can keep this)

## Step 6: Test Connection

1. Start your Node.js server:
   ```bash
   npm start
   ```

2. Check the console for "MongoDB Atlas connected successfully"

3. If you see connection errors, verify:
   - Username and password are correct
   - IP address is whitelisted
   - Connection string format is correct

## Security Best Practices

### For Production:
1. **Never commit .env files** to version control
2. **Use specific IP addresses** instead of 0.0.0.0/0
3. **Create separate databases** for development and production
4. **Use strong passwords** for database users
5. **Enable MongoDB Atlas monitoring** and alerts

### Environment Variables for Production:
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mbizo-school-prod?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-production-jwt-secret
```

## Troubleshooting

### Common Issues:

1. **Authentication Failed**
   - Check username and password
   - Ensure user has correct permissions

2. **Connection Timeout**
   - Check network access settings
   - Verify IP address is whitelisted

3. **Database Not Found**
   - MongoDB will create the database automatically on first write
   - Ensure database name in connection string is correct

4. **SSL/TLS Errors**
   - Ensure you're using `mongodb+srv://` (not `mongodb://`)
   - Update Node.js if using very old version

### Getting Help:
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- MongoDB Community Forums: https://community.mongodb.com/
- Project Support: support@mbizohigh.ac.zw

## Sample Data

The application will automatically create sample data on first run:
- Admin user: `admin` / `password123`
- Teacher user: `teacher1` / `password123`
- Student user: `student1` / `password123`

You can modify these in the `server.js` file's `initializeSampleData()` function.