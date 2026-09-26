# Manpower Hire — Demo Setup Guide

A working demo of a **digital recruitment platform for manpower companies**.

- **Mobile app:** React Native (Expo Go), one app with two roles: Candidate and Company (HR)
- **Backend:** Django + Django REST Framework + SQLite (no database install needed)

```
recruit-demo/
├── Setup.md          <- this file
├── backend/          <- Django API
└── mobile/           <- App.js + src/ (copied into an Expo project, see Part 2)
```

## What the demo shows

| Area | Included in demo |
|---|---|
| Mobile-number login with OTP | Yes (demo OTP is always `123456`) |
| Company: post job with skill level, salary, contract, duty hours | Yes |
| Auto-reject rule (minimum experience) | Yes |
| Candidate: profile, browse jobs, one-tap apply | Yes |
| Smart matching score (skills, experience, salary, location) | Yes, jobs and applicants are ranked by score |
| Application tracking with status timeline | Yes |
| Company pipeline: review, shortlist, schedule interview, select, reject | Yes |
| Interview slots (online or in-person) | Yes |
| Offer letter, accepted or declined by candidate | Yes (auto-generated text) |
| Company dashboard stats | Yes |
| Django admin panel | Yes, at `/admin/` |

Not in the demo (planned for the full product): real SMS OTP, real video calls, chat, document upload and verification, WhatsApp integration, e-signature, Arabic UI, Nafath/Qiwa/Absher integration.

---

## Prerequisites

- **Python 3.10+** (check: `python --version` or `python3 --version`)
- **Node.js 18+ LTS** (check: `node --version`)
- **Expo Go** app on your phone (App Store / Google Play)
- Your phone and computer on the **same Wi-Fi network**

---

## Part 1 — Backend (Django)

Open a terminal in the `backend` folder.

**1. Create a virtual environment**

Mac / Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```
Windows (PowerShell):
```powershell
python -m venv venv
venv\Scripts\activate
```

**2. Install dependencies**
```bash
pip install -r requirements.txt
```

**3. Create the database and load demo data**
```bash
python manage.py makemigrations core
python manage.py migrate
python manage.py seed
```
The seed command creates 2 companies, 4 candidates, 4 jobs and a few applications.

**4. Start the server so your phone can reach it**
```bash
python manage.py runserver 0.0.0.0:8000
```
Keep this terminal open. Test it: open `http://localhost:8000/admin/` in your browser (you should see the Django admin login).

Optional, to browse data in the admin panel: `python manage.py createsuperuser`.

---

## Part 2 — Mobile app (Expo Go)

**1. Find your computer's local IP address**

- Windows: run `ipconfig`, look for "IPv4 Address" (e.g. `192.168.1.25`)
- Mac: run `ipconfig getifaddr en0`
- Linux: run `hostname -I`

**2. Create a fresh Expo project** (this guarantees the version matches the current Expo Go app)
```bash
npx create-expo-app@latest recruit-mobile --template blank
cd recruit-mobile
```

**3. Copy the demo code in**

Copy `App.js` and the whole `src` folder from this package's `mobile/` folder into `recruit-mobile/`, **replacing the existing `App.js`**.

**4. Install the one extra dependency**
```bash
npx expo install @react-native-async-storage/async-storage
```

**5. Set the API address**

Open `src/config.js` and replace `YOUR_COMPUTER_IP` with the IP from step 1:
```js
export const API_URL = 'http://192.168.1.25:8000/api';
```

**6. Start Expo**
```bash
npx expo start
```
Scan the QR code with your phone (Android: inside Expo Go; iPhone: with the Camera app, which opens Expo Go).

---

## Demo walkthrough (about 5 minutes)

Demo accounts (OTP is always `123456`):

| Role | Mobile number |
|---|---|
| Company (Al-Noor Manpower) | `0500000001` |
| Company (Gulf Skilled Workforce) | `0500000002` |
| Candidate (Rahim Khan, electrician) | `0500000003` |

The login screen also has **Quick demo login** buttons.

1. **Company:** log in as Company. See the dashboard stats and jobs. Tap **Plumber** to see ranked applicants.
2. Open the **Post job** tab, create a job (e.g. "Mason", skills "mason, concrete", min experience 3, auto-reject On), and publish.
3. **Candidate:** log out, log in as Candidate. The **Jobs** tab shows jobs ranked by match score. Apply to "Electrician" (match is high) and to your new "Mason" job.
4. Edit the **Profile** tab (change skills or experience) and watch the match scores change.
5. **Company:** log back in, open the job, and move the applicant through **Start review, Shortlist, Schedule interview** (pick a slot), then **Select & send offer**.
6. **Candidate:** open **Applications**. The timeline, interview slot, and offer appear. Tap **Accept**.
7. **Company:** the dashboard now shows 1 hired.

Auto-reject demo: create a candidate account with 0 years of experience and apply to a job with auto-reject On. The application is rejected instantly.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" on the phone | Check `API_URL` in `src/config.js`. Do not use `localhost` or `127.0.0.1` (that refers to the phone itself). |
| Still cannot connect | Confirm the backend runs with `0.0.0.0:8000`, phone and PC are on the same Wi-Fi, and your firewall allows port 8000 (Windows: allow Python through Windows Defender Firewall). Test by opening `http://YOUR_IP:8000/admin/` in your phone's browser. |
| Expo Go cannot load the project | Try `npx expo start --tunnel`. Corporate or guest Wi-Fi often blocks local connections. |
| `No module named rest_framework` | The virtual environment is not active. Activate it and run `pip install -r requirements.txt` again. |
| `no such table` errors | Run `python manage.py makemigrations core` and `python manage.py migrate`. |
| Want a clean start | Delete `backend/db.sqlite3` and repeat Part 1, step 3. |
| SDK version mismatch in Expo Go | Always create the project with `create-expo-app@latest`, as in Part 2, step 2. |

---

## API reference (for developers)

All endpoints are under `/api`. Authenticated calls send `Authorization: Token <token>`.

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/auth/login` | Anyone | Phone + OTP login, creates the account on first use |
| GET / PUT | `/me` | Any | View or update profile |
| GET | `/stats` | Company | Dashboard counts |
| GET / POST | `/jobs` | Any / Company | List jobs (candidates get match scores) / post a job |
| POST | `/jobs/<id>/apply` | Candidate | Apply to a job (applies auto-reject rule) |
| GET | `/applications` | Any | Own applications / applicants (`?job=<id>`) |
| PATCH | `/applications/<id>` | Company | Change status, set interview slot, send offer |
| POST | `/applications/<id>/offer` | Candidate | Accept or decline offer (`{"accept": true}`) |

Match score (0–100): skills 50%, experience 25%, salary fit 15%, location 10%. See `match_score()` in `backend/core/models.py`.

---

## Next steps toward the full product

1. Real OTP via an SMS provider, and Nafath / Absher identity checks
2. Document upload and a verification badge workflow
3. In-app chat with auto-translation, and video interviews (Agora or Zoom)
4. Arabic / English / Urdu / Hindi / Bengali UI with RTL support
5. Company web dashboard (React) and a super-admin panel
6. Move from SQLite to PostgreSQL and deploy the API behind HTTPS
