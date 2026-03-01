# Deployment Guide

## Railway Deployment

### Prerequisites
- MongoDB Atlas account (free tier available)
- Railway account (https://railway.app)
- GitHub repository connected to Railway

### Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user with a strong password
4. Whitelist Railway's IP range:
   - Go to **Network Access**
   - Add entry: `0.0.0.0/0` (allows all IPs) or use Railway's specific IP range if available
5. Get your connection string:
   - Click **Connect**
   - Choose **Connect your application**
   - Copy the connection string
   - Replace `<username>` and `<password>` with your database user credentials

Example:
```
mongodb+srv://username:password@cluster.mongodb.net/hackshield?retryWrites=true&w=majority
```

### Step 2: Configure Environment Variables in Railway

1. Log in to [Railway](https://railway.app/dashboard)
2. Open your HackShield Portal project
3. Click on your service (the app)
4. Go to the **Variables** tab
5. Add the following variables:

#### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `MONGODB_URI` | Your MongoDB connection string | Must include username, password, cluster, and database |
| `NEXTAUTH_URL` | `https://your-railway-domain.up.railway.app` | Copy from Railway's **Domains** tab |
| `NEXTAUTH_SECRET` | Generate random string | Use: `openssl rand -base64 32` |
| `JWT_SECRET` | Generate random string | Use: `openssl rand -base64 32` |

#### Optional Variables (for future features)

```
NEXTAUTH_PROVIDERS_GOOGLE=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

NEXTAUTH_PROVIDERS_GITHUB=true
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret
```

### Step 3: Deploy

1. **Manual Deploy:**
   - Go to your service in Railway
   - Click **Deploy** button

2. **Automatic Deploy:**
   - Railway automatically redeploys when you push to the default branch
   - Check the **Deployments** tab for status

> **Note:** If you see npm warnings like `npm warn config production Use --omit=dev instead`, these are harmless deprecation warnings and won't affect the build. The project includes `.npmrc` configuration to suppress these warnings.

### Step 4: Verify Deployment

1. Click the **Domains** tab to get your app URL
2. Visit `https://your-railway-domain.up.railway.app`
3. Test the registration flow

If you see errors like `Please define the MONGODB_URI environment variable inside .env.local`, ensure:
- All variables from Step 2 are set
- Variable names are **exactly** as shown (case-sensitive)
- You've clicked **Deploy** or **redeploy** after adding variables
- MongoDB connection string is valid

### Troubleshooting

#### "MONGODB_URI undefined" Error
- Check that the variable is set in Railway's **Variables** tab
- Verify the connection string syntax
- Confirm MongoDB cluster allows Railway's IP:
  - In MongoDB Atlas → Network Access
  - Add `0.0.0.0/0` or specific Railway IP range

#### "querySrv EBADNAME" or "Unable to resolve hostname" Error
This error means Mongoose cannot resolve the MongoDB cluster hostname.

**Common causes:**
- Connection string uses placeholder values (`<cluster>`, `<username>`, `<password>`)
- Cluster name in the URL doesn't exist or is misspelled
- Cluster is paused in MongoDB Atlas
- Invalid connection string format

**Fix:**
1. **Get the correct connection string:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Click your **Cluster** → **Connect**
   - Select **Drivers** → **Node.js**
   - Copy the **entire** connection string (don't modify it except for password)

2. **Verify the format:**
   ```
   mongodb+srv://username:password@cluster0.abc123.mongodb.net/hackshield?retryWrites=true&w=majority
   ```
   Should NOT contain: `<username>`, `<password>`, `<cluster>`, or `<.xxxxx.>`

3. **Check your cluster:**
   - In MongoDB Atlas, go to **Clusters**
   - If cluster is **paused**: click the three dots → **Resume**
   - If cluster is **deleted**: create a new one

4. **Update Railway variable:**
   - Go to Railway → Service → **Variables**
   - Update `MONGODB_URI` with the **exact** string from step 1
   - Click **Deploy** or **Redeploy**

5. **Test the connection locally:**
   ```bash
   # First, ensure MONGODB_URI is in .env.local
   npm run dev
   # Try to register or access an API that uses the database
   ```

#### Build Fails
- Check Railway's build logs for errors
- Ensure `package.json` and `package-lock.json` are committed
- Verify all required environment variables are set before build

#### App Crashes on Startup
- Check app logs in Railway dashboard
- Verify MongoDB connection string
- Ensure `NEXTAUTH_SECRET` and `JWT_SECRET` are set

### Security Notes

⚠️ **Never commit `.env.local` to GitHub** – it contains sensitive credentials.

- `.env.local` is in `.gitignore` and should stay there
- Always set production secrets in Railway's **Variables** tab
- Rotate MongoDB passwords regularly
- Use strong, random secrets for `NEXTAUTH_SECRET` and `JWT_SECRET`

### Monitoring & Logs

1. Go to your service in Railway
2. Click **Logs** tab to see real-time application output
3. Look for errors related to:
   - MongoDB connection issues
   - Missing environment variables
   - Authentication failures

### Redeploying

To force a redeploy after environment changes:
1. Make a small code change and push to the default branch, OR
2. Go to **Deployments** tab and click **Redeploy** on the latest deployment

---

For more help, visit [Railway Docs](https://docs.railway.app) or [Next.js Deployment Guide](https://nextjs.org/docs/deployment).
