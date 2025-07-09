# 🚀 Netlify Deployment Guide

Complete guide to deploy your ETF Trading Strategy application to Netlify with production-ready configuration.

## 📋 Prerequisites

- ✅ **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
- ✅ **Supabase Project**: Set up and configured (see README.md)
- ✅ **Git Repository**: Code pushed to GitHub, GitLab, or Bitbucket
- ✅ **Domain** (optional): For custom domain setup

## 🛠️ Step-by-Step Deployment

### 1. Prepare Your Application

#### A. Configure Environment Variables
Before deploying, you need to set up your Supabase credentials. You have two options:

**Option 1: Environment Variables (Recommended)**
1. Keep the meta tags empty in `index.html`:
   ```html
   <meta name="SUPABASE_URL" content="">
   <meta name="SUPABASE_ANON_KEY" content="">
   ```

**Option 2: Direct Configuration**
1. Update the meta tags in `index.html` with your Supabase credentials:
   ```html
   <meta name="SUPABASE_URL" content="https://your-project.supabase.co">
   <meta name="SUPABASE_ANON_KEY" content="your-anon-key-here">
   ```

#### B. Create Netlify Configuration File
Create a `netlify.toml` file in your project root:

```toml
[build]
  publish = "."
  command = "echo 'No build step required for static site'"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https:; font-src 'self' data:;"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Security headers for production
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

#### C. Create `_redirects` File (Alternative to netlify.toml)
If you prefer, create a `_redirects` file in your project root:

```
/*    /index.html   200
```

### 2. Deploy to Netlify

#### Option A: Deploy from Git Repository (Recommended)

1. **Connect Your Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Choose your Git provider (GitHub, GitLab, Bitbucket)
   - Authorize Netlify to access your repositories
   - Select your ETF Trading Strategy repository

2. **Configure Build Settings**:
   ```
   Build command: (leave empty or use: echo "No build required")
   Publish directory: . (current directory)
   ```

3. **Set Environment Variables**:
   - Go to Site Settings > Environment Variables
   - Add the following variables:
     ```
     SUPABASE_URL = https://your-project.supabase.co
     SUPABASE_ANON_KEY = your-anon-key-here
     ```

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your application
   - You'll get a random URL like `https://amazing-app-123456.netlify.app`

#### Option B: Manual Deploy

1. **Prepare Your Files**:
   - Ensure all files are in one directory
   - Include the `netlify.toml` file
   - Update `index.html` with your Supabase credentials (if not using environment variables)

2. **Deploy via Drag & Drop**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Drag your project folder to the deploy area
   - Or use the file picker to select your folder

3. **Configure Site Settings**:
   - Go to Site Settings > Environment Variables
   - Add your Supabase credentials if needed

### 3. Configure Custom Domain (Optional)

1. **Purchase Domain**: Buy a domain from any registrar (GoDaddy, Namecheap, etc.)

2. **Add Domain to Netlify**:
   - Go to Site Settings > Domain Management
   - Click "Add custom domain"
   - Enter your domain (e.g., `etf-strategy.com`)

3. **Configure DNS**:
   - **Option A**: Use Netlify DNS (Recommended)
     - Change nameservers at your registrar to Netlify's nameservers
     - Netlify will automatically configure SSL

   - **Option B**: Configure A/CNAME records manually
     - Add these records at your DNS provider:
       ```
       Type: CNAME
       Name: www
       Value: your-site-name.netlify.app
       
       Type: A
       Name: @
       Value: 75.2.60.5
       ```

4. **Enable SSL**:
   - Go to Site Settings > Domain Management > HTTPS
   - SSL certificate is automatically provisioned
   - Force HTTPS redirect (recommended)

### 4. Production Optimization

#### A. Performance Optimization

1. **Enable Asset Optimization**:
   - Go to Site Settings > Build & Deploy > Post Processing
   - Enable "Bundle CSS" and "Minify CSS"
   - Enable "Minify JS"
   - Enable "Compress images"

2. **Enable Gzip Compression**:
   - Already enabled by default in Netlify

#### B. Security Configuration

1. **Update Supabase Authentication**:
   - Go to your Supabase project > Authentication > Settings
   - Update "Site URL" to your production domain
   - Add redirect URLs:
     ```
     https://your-domain.com
     https://your-domain.com/auth/callback
     ```

2. **Configure CORS** (if needed):
   - Usually not required for static sites

### 5. Environment-Specific Configuration

#### Development
```javascript
// Automatically detected by the app
localStorage.setItem('supabase-url', 'your-dev-url');
localStorage.setItem('supabase-anon-key', 'your-dev-key');
```

#### Production
```bash
# Set in Netlify dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
```

### 6. Testing Your Deployment

1. **Functionality Testing**:
   - ✅ Visit your deployed site
   - ✅ Test user registration
   - ✅ Test user login/logout
   - ✅ Test password reset
   - ✅ Upload a CSV file
   - ✅ Test budget configuration
   - ✅ Test strategy calculation

2. **Performance Testing**:
   - Use [PageSpeed Insights](https://pagespeed.web.dev/)
   - Check loading times
   - Verify mobile responsiveness

3. **Security Testing**:
   - Test that users can only see their own data
   - Verify SSL certificate is working
   - Check security headers

### 7. Continuous Deployment

#### Auto-Deploy on Git Push
1. **Branch Deploy**:
   - Production: `main` or `master` branch
   - Staging: `develop` or `staging` branch

2. **Deploy Previews**:
   - Automatically enabled for pull requests
   - Each PR gets a unique preview URL

#### Manual Deploy
```bash
# Using Netlify CLI
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### 8. Monitoring and Maintenance

#### A. Analytics Setup
1. **Netlify Analytics**:
   - Enable in Site Settings > Analytics
   - $9/month for detailed analytics

2. **Google Analytics** (Free):
   - Add GA4 tracking code to your `index.html`
   - Monitor user behavior and performance

#### B. Error Monitoring
1. **Netlify Error Tracking**:
   - Available in Site Settings > Functions
   - Monitor JavaScript errors

2. **Supabase Monitoring**:
   - Monitor database performance
   - Check authentication logs

### 9. Troubleshooting

#### Common Issues

1. **"Site Not Found" Error**:
   - Check your `_redirects` file or `netlify.toml`
   - Ensure SPA redirect is configured

2. **Authentication Not Working**:
   - Verify Supabase Site URL is set correctly
   - Check that HTTPS is enabled
   - Ensure environment variables are set

3. **CORS Errors**:
   - Update Supabase CORS settings
   - Check your domain is whitelisted

4. **Database Connection Failed**:
   - Verify environment variables are set correctly
   - Check Supabase project status
   - Ensure RLS policies are configured

#### Debug Steps
1. Check browser console for JavaScript errors
2. Verify network requests in DevTools
3. Check Netlify deploy logs
4. Review Supabase logs

### 10. Security Checklist

Before going live, ensure:

- ✅ **Environment Variables**: Never commit secrets to Git
- ✅ **HTTPS**: Always use HTTPS in production
- ✅ **CSP Headers**: Configure Content Security Policy
- ✅ **Supabase RLS**: Row Level Security enabled
- ✅ **Domain Validation**: Verify your domain in Supabase
- ✅ **Regular Updates**: Keep dependencies updated
- ✅ **Backup Strategy**: Regular database backups

## 🎉 You're Live!

Your ETF Trading Strategy application is now live on Netlify! 🚀

### Next Steps:
1. **Share your app** with users
2. **Monitor performance** and user feedback
3. **Regular updates** and feature additions
4. **Scale** as your user base grows

### Support:
- **Netlify Support**: [support.netlify.com](https://support.netlify.com)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Community**: Join developer communities for help

---

**🔗 Quick Links:**
- [Netlify Dashboard](https://app.netlify.com/)
- [Supabase Dashboard](https://app.supabase.com/)
- [Domain Management](https://app.netlify.com/sites/your-site/settings/domain)
- [Environment Variables](https://app.netlify.com/sites/your-site/settings/env)

Happy deploying! 🎯