# Sunday sermon video: one-time setup

Every Sunday at 12:30 PM, a GitHub robot gets the newest video from the church
Facebook page and shows it on the Home page (Online Sermons).

Until you do this setup, the Home page shows the Facebook feed box instead.
Nothing breaks.

You do this setup only once. It takes about 15 minutes.
You must be an admin of the church Facebook page.

## Step 1: Make a Facebook app

1. Go to https://developers.facebook.com and log in with your Facebook account.
2. Click **My Apps**, then **Create App**.
3. Name it `FBC Capac Website`. Pick the option for "Other" or "Business" if it asks.
4. Finish. Leave the app in **Development** mode. You do not need app review.

## Step 2: Get a short key

1. Go to https://developers.facebook.com/tools/explorer
2. In **Meta App**, pick `FBC Capac Website`.
3. Under **Permissions**, add `pages_show_list` and `pages_read_engagement`.
4. Click **Generate Access Token**. Say yes to the church page.
5. Copy the long text in **Access Token**.

## Step 3: Make the key long-lasting

1. Go to https://developers.facebook.com/tools/debug/accesstoken
2. Paste the key. Click **Debug**.
3. At the bottom, click **Extend Access Token**. Copy the new key.
4. Go back to the Graph API Explorer. Paste the new key in **Access Token**.
5. In the box at the top, type `me/accounts` and click **Submit**.
6. Find the church page in the result. Copy two things:
   - `id` (the page ID, only numbers)
   - `access_token` (the page key. This one does not expire.)

## Step 4: Put the key in GitHub

1. Open the website project on github.com.
2. Go to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** two times:
   - Name `FB_PAGE_ID`, value: the page ID from step 3.
   - Name `FB_PAGE_TOKEN`, value: the page key from step 3.

## Step 5: Test it

1. In the project on github.com, go to **Actions** → **Deploy site**.
2. Click **Run workflow**.
3. After about 1 minute, the Home page shows the newest Facebook video.

## If it stops working

GitHub sends you an email when the robot fails. Most of the time this means the
Facebook key stopped working (for example, after a Facebook password change).
Do steps 2, 3 and 4 again. Then the robot works again.
