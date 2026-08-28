# How to Deploy to Netlify

This project is fully configured for zero-config Netlify deployment using `netlify.toml`.

---

## Method 1: Deploy via Git / GitHub (Recommended)

1. **Push your code to GitHub, GitLab, or Bitbucket.**
2. Go to [app.netlify.com](https://app.netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
3. Select your repository.
4. Netlify will automatically detect your build settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node Version**: `20`
5. *(Optional)* If using AI features, add your environment variable:
   - Go to **Site Configuration** > **Environment variables** > **Add a variable**.
   - Key: `GEMINI_API_KEY`
   - Value: `<your-gemini-api-key>`
6. Click **"Deploy Site"**.

---

## Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI globally (if not already installed):**
   ```bash
   npm install -g netlify-cli
   ```

2. **Log into your Netlify account:**
   ```bash
   netlify login
   ```

3. **Link or initialize your site:**
   ```bash
   netlify init
   ```

4. **Set environment variables (optional):**
   ```bash
   netlify env:set GEMINI_API_KEY your_api_key_here
   ```

5. **Deploy directly to production:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

---

## Environment Variables
- `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key. Stored securely in Netlify Environment Variables and never committed to version control.

