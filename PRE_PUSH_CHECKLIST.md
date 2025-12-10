# Pre-Push Security Checklist ✅

## Before Pushing to Git

Run through this checklist to ensure no credentials are exposed:

---

## 🔍 Step 1: Check Git Status

```bash
git status
```

**Verify:**

- [ ] `.env` is NOT listed
- [ ] No credential files are listed
- [ ] Only intended files are staged

---

## 🔍 Step 2: Check Staged Changes

```bash
git diff --cached
```

**Verify:**

- [ ] No AWS_ACCESS_KEY_ID visible
- [ ] No AWS_SECRET_ACCESS_KEY visible
- [ ] No hardcoded credentials
- [ ] No API keys or tokens

---

## 🔍 Step 3: Search for Credentials

```bash
# Search staged files for credentials
git diff --cached | grep -iE "(aws_access_key|aws_secret)"
```

**Expected result:** No output (empty)

If anything appears, **DO NOT PUSH!**

---

## 🔍 Step 4: Verify .gitignore

```bash
# Check if .env is ignored
git check-ignore .env
```

**Expected result:** `.env` (confirms it's ignored)

---

## 🔍 Step 5: Check for Sensitive Files

```bash
# List all tracked files
git ls-files | grep -E "(\.env$|credentials|\.pem$|\.key$)"
```

**Expected result:** No output (empty)

If any sensitive files appear, remove them:

```bash
git rm --cached <filename>
```

---

## 🔍 Step 6: Review Commit Message

```bash
# View what will be committed
git log --oneline -1
```

**Verify:**

- [ ] Commit message doesn't contain credentials
- [ ] Commit message is descriptive
- [ ] No sensitive information in message

---

## 🔍 Step 7: Final Verification

```bash
# Run all checks at once
echo "Checking for credentials..."
git diff --cached | grep -iE "(aws_access_key|aws_secret)" && echo "❌ CREDENTIALS FOUND - DO NOT PUSH!" || echo "✅ No credentials found"

echo "Checking .env is ignored..."
git check-ignore .env && echo "✅ .env is ignored" || echo "❌ .env is NOT ignored!"

echo "Checking for sensitive files..."
git ls-files | grep -E "(\.env$|credentials|\.pem$|\.key$)" && echo "❌ Sensitive files tracked!" || echo "✅ No sensitive files"
```

---

## ✅ Safe to Push Checklist

Before running `git push`, confirm:

- [ ] `.env` file is NOT in git status
- [ ] No credentials in `git diff --cached`
- [ ] `.env` is properly ignored
- [ ] No sensitive files are tracked
- [ ] Commit message is clean
- [ ] `.env.example` is updated (without real credentials)
- [ ] SECURITY_GUIDE.md is up to date
- [ ] Server tested locally with .env file
- [ ] All tests pass

---

## 🚀 Push Commands

Once all checks pass:

```bash
# Add your changes
git add <files>

# Commit with descriptive message
git commit -m "Your descriptive message"

# Push to remote
git push origin main
```

---

## 🆘 If You Find Credentials

**STOP! Do not push!**

1. **Remove from staging:**

   ```bash
   git reset HEAD <file>
   ```

2. **Remove credentials from file:**

   ```bash
   # Edit the file and remove credentials
   # Use .env file instead
   ```

3. **Re-stage the clean file:**

   ```bash
   git add <file>
   ```

4. **Verify again:**
   ```bash
   git diff --cached | grep -i "aws_access"
   ```

---

## 📋 Quick Command Reference

```bash
# Check what will be pushed
git diff --cached

# Check for credentials
git diff --cached | grep -i "aws"

# Verify .env is ignored
git check-ignore .env

# See all tracked files
git ls-files

# Remove file from staging
git reset HEAD <file>

# Remove file from git entirely
git rm --cached <file>
```

---

## ✅ Post-Push Verification

After pushing:

1. **Check the remote repository:**

   - View files on GitHub/GitLab
   - Verify .env is not there
   - Check recent commits for credentials

2. **Test on another machine:**
   ```bash
   git clone <repo-url>
   cd contract-ai-platform
   cp .env.example .env
   # Add credentials to .env
   ./start_server.sh
   ```

---

## 🎯 What Should Be Pushed

**Safe to push:**

- ✅ `.env.example` (template without real credentials)
- ✅ `.gitignore` (with .env listed)
- ✅ `start_server.sh` (startup script)
- ✅ `SECURITY_GUIDE.md` (this guide)
- ✅ Source code files
- ✅ Documentation
- ✅ Configuration templates

**Never push:**

- ❌ `.env` (actual credentials)
- ❌ `credentials` files
- ❌ `.pem` or `.key` files
- ❌ Any file with real AWS keys
- ❌ Backup files with credentials

---

## 🔒 Remember

**When in doubt, don't push!**

It's better to double-check than to expose credentials.

---

**Stay secure! 🛡️**
