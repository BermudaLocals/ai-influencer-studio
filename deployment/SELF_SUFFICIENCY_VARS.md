# New Railway Environment Variables — Self-Sufficiency Upgrade

## Required to add to Railway dashboard:

### Storage (pick ONE)
STORAGE_MODE=r2                          # or 's3' or 'local'
R2_ACCOUNT_ID=your_account_id           # Cloudflare R2 (free 10GB/mo)
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=empire-assets
R2_PUBLIC_URL=https://assets.yourdomain.com

# OR AWS S3:
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=empire-assets

### Worker Settings
WORKER_CONCURRENCY=3                    # Jobs processed in parallel per worker

### Alerts (optional but recommended)
ALERT_WEBHOOK_URL=https://hooks.slack.com/...  # Slack/Discord webhook for failure alerts

### Platform Publishing (add as you connect)
TIKTOK_ACCESS_TOKEN=...
YOUTUBE_OAUTH=...
# IG_BUSINESS_ID already in Railway
# FB_ACCESS_TOKEN already in Railway

### AI
OPENAI_API_KEY=...                      # For Whisper captions (optional)

## Already in Railway (verify these exist):
# REDIS_URL, DATABASE_URL, REPLICATE_API_TOKEN
# ELEVENLABS_API_KEY, KLING_API_KEY, OPENROUTER_API_KEY
# JWT_SECRET, AGENT_ZERO_KEY
