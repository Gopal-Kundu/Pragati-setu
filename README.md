# 🌉 Jharkhand Pragati Setu (झारखंड प्रगति सेतु)
### Smart India Hackathon (SIH 2026) &bull; Societal Problem-to-Innovation Ecosystem Platform

### 🔑 Demo Login Credentials

| Stakeholder / Role | Email | Password |
| :--- | :--- | :--- |
| **Citizen** | `citizen@sih2026.gov.in` | `Citizen@2026` |
| **University** | `university@sih2026.gov.in` | `Univ@2026` |
| **Industry CSR** | `industry@sih2026.gov.in` | `Industry@2026` |
| **Government** | `govt@sih2026.gov.in` | `Govt@2026` |

---

## 📌 Executive Overview

**Jharkhand Pragati Setu** is an end-to-end digital collaboration and governance platform engineered for the **State of Jharkhand** to bridge the gap between grassroots societal challenges, higher education institutions (HEIs), industry corporate social responsibility (CSR) partners, and government administration.

Citizens and Gram Panchayats report localized grievances and infrastructural bottlenecks with rich multimedia evidence. Our proprietary **AI Intelligence Engine** automatically triages, scores severity, deduplicates, and matches challenges to university research laboratories. Universities formulate multidisciplinary student-faculty teams, submit solution proposals, secure corporate CSR matching grants, and receive statutory Government Sanction Orders.

---

## 📸 Platform Visual Tour & Screenshots

| 🏠 Landing & Discovery Portal | 🏆 Solved Challenges Showcase |
|:---:|:---:|
| <img src="./frontend/src/assets/Images/Landing%20Page.png" alt="Jharkhand Pragati Setu Landing Page" width="100%"/> | <img src="./frontend/src/assets/Images/Solved%20Problem%20Screen%20Landing%20page%20p-2.png" alt="Solved Problem Screen Landing page" width="100%"/> |
| *Modern Citizen & Institutional Onboarding Portal* | *Real-Time Telemetry & Solved Challenge Showcase* |

| 👨‍🌾 Citizen Problem Reporting | 🎓 University Research Hub |
|:---:|:---:|
| <img src="./frontend/src/assets/Images/Community%20Page%20Report%20Problem.png" alt="Community Page Report Problem" width="100%"/> | <img src="./frontend/src/assets/Images/University%20Page.png" alt="University Research & Lab Portal" width="100%"/> |
| *Multipart Evidence Upload & AI Duplicate Check* | *Lab Capability Management & Proposal Formulation* |

| 🏢 Industry CSR Matching | 🏛️ Government Tripartite Sanction |
|:---:|:---:|
| <img src="./frontend/src/assets/Images/Industry%20Page%20accepting%20proposal.png" alt="Industry Page accepting proposal" width="100%"/> | <img src="./frontend/src/assets/Images/Govt%20page%20project%20approval.png" alt="Govt page project approval" width="100%"/> |
| *CSR Section 135 Allocation & Grant Pledge Desk* | *3-Pillar Unified Inspection & Sanction Orders* |

---

## ✨ Key Features & Stakeholder Portals

### 1. 👨‍🌾 Citizen & Gram Panchayat Portal (`/community`)
- **Grassroots Challenge Submission**: Submit societal problems with title, narrative description, district, block, panchayat, and GPS coordinates.
- **Rich Multipart Evidence Upload**: Upload multiple photos, video walkthroughs, and PDF documents directly to Cloudinary CDN storage.
- **AI Duplicate Detection**: Real-time semantic duplicate check to prevent duplicate grievances in the same locality.
- **End-to-End Audit Trail**: Live milestone progress tracking from submission $\rightarrow$ AI triage $\rightarrow$ HEI research $\rightarrow$ CSR funding $\rightarrow$ field deployment.



### 2. ⚡ AI Triage & Matchmaking Engine (`/api/ai`)
- **10 Canonical Domain Classification**: Real-time classification into state-defined innovation domains.
- **Automated Severity & Urgency Scoring**: Numeric impact scoring (1.0 to 10.0) and urgency levels (`Critical`, `High`, `Medium`, `Low`).
- **Academic Discipline Recommendation**: Suggests 2-4 multidisciplinary research departments (e.g., *Hydrogeology, IoT Telemetry, Environmental Engineering*).
- **Automated Corporate CSR Matchmaking**: Evaluates proposal methodology against corporate CSR mandates to suggest optimal corporate partners.

### 3. 🎓 University R&D & Incubation Hub (`/university`)
- **HEI Profile Management**: Institutional registration with research domains, lab capabilities, and faculty specializations.
- **Multidisciplinary Team Formulation**: Assemble teams of Faculty Leads, Student Researchers, and Domain Experts.
- **Structured Proposal Creation**: Submit technical solutions with milestones, tech stack, duration, and budget.
- **Accepted Offers & Govt Sanctions**: View all accepted CSR sponsorships forwarded to the State Government with real-time statutory sanction tracking.



### 4. 🏢 Industry CSR & Innovation Exchange (`/industry`)
- **Corporate Profile Registration**: Register company details, Section 135 CSR annual allocation pool, and support capabilities.
- **Targeted Proposal Discovery**: Filter university proposals by domain, keyword search, or AI recommendations.
- **Tripartite CSR Co-Sponsorship**: Pledge grant funds, hardware/equipment, and assign corporate technical mentors.
- **Interactive Review & Decline Modals**: Accept or decline proposals with structured feedback notifications sent directly to universities.



### 5. 🏛️ Government Tripartite Sanction Desk (`/dashboard`)
- **3-Pillar Unified Proposal Inspection**: Review Citizen Problem Details, University Technical Solution, and Industry CSR Commitments side-by-side.
- **Statutory Sanction Order Generation**: Issue official government sanction orders (e.g. `JH-SANCTION-2026-XXXX`) with administrative remarks.
- **Decline / Revision Management**: Decline proposals with formal reasons dispatched instantly to both HEI and Industry partners.
- **Real-Time Notification Dispatch**: Automatic multi-party notification routing across all stakeholders.



### 6. 🎙️ भाषिणी (Bhashini) Multilingual Voice Grievance & AI Triage (`/lan` & Voice Modal)
- **Voice-First Citizen Empowerment**: Empowers rural, tribal, and semi-literate citizens to report societal problems and civic grievances naturally using their voice in their native mother tongue.
- **22+ Scheduled Indian Languages**: Integrated with Digital India भाषिणी (Bhashini) architecture and neural language translation, supporting Hindi, Santhali, Bengali, Bhojpuri, Maithili, Odia, Urdu, and more via a dedicated Language Portal (`/lan`).
- **Persistent Language Preference**: Cookie-stored language preferences immediately localize the platform and prime the voice speech recognition engine.
- **AI Speech-to-Grievance Structuring**: Tap-to-speak modal with intelligent speech pause retention (*"Please tell us your problem and location"*). Continuous voice transcripts are analyzed by Google Gemini to automatically generate a structured problem title, comprehensive description, and geographical location.
- **1-Click Community Form Auto-Fill**: One click on "Submit" instantly injects the structured problem narrative directly into the Community Reporting form, bypassing tedious manual typing.

---

## 🎯 10+ Canonical Problem Domains

| # | Domain | Typical Innovation Focus |
|---|--------|--------------------------|
| 1 | **Water Resources** | Groundwater contamination remediation, Solar-IoT filtration, smart check-dams |
| 2 | **Agriculture** | Microclimate sensing, pest forensics, solar cold storage, precision irrigation |
| 3 | **Healthcare** | Telemedicine diagnostics, drone medical logistics, rural maternal health telemetry |
| 4 | **Education** | Smart digital classrooms, vernacular learning tech, vocational skill labs |
| 5 | **Environment** | Mine air quality sensors, forest fire detection, bio-waste circular economy |
| 6 | **Energy** | Decentralized solar microgrids, biomass power, smart village transformer monitoring |
| 7 | **Urban Development** | Smart drainage sensors, plastic-waste aggregate roads, traffic telemetry |
| 8 | **Accessibility** | Assistive mobility devices, tactile navigation, speech-to-text kiosks |
| 9 | **Public Administration** | Blockchain scheme delivery, DBT telemetry, public service audit trails |
| 10 | **Rural Livelihoods** | Lac & bamboo value-addition machinery, tribal handicraft market linkages |

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS, PostCSS
- **State Management**: Redux Toolkit & React Context
- **Routing**: React Router DOM (v7)
- **Voice Recognition**: Web Speech Recognition API with Bhashini locale matching
- **Multilingual Localization**: Styled Google Neural Translate & Persistent Cookie Store
- **Icons**: Lucide React
- **Notifications**: Sonner Toasts
- **Maps**: React-Leaflet, Leaflet GIS
- **Deployment**: Vercel SPA (`vercel.json`)

### Backend & AI Intelligence
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB Atlas via Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT) & Secure HTTP-Only Cookies
- **File Upload**: Multer with Cloudinary CDN Storage
- **Voice Grievance Pipeline**: Digital India भाषिणी (Bhashini) ULCA ASR & NMT
- **Generative AI Engine**: Google Gemini (Speech-to-Problem structuring, Severity Triage & CSR Matchmaking)
- **Email Notifications**: Nodemailer SMTP Integration

---

## 📁 Repository Structure

```
Jharkhand-Pragati-Setu/
├── backend/
│   ├── src/
│   │   ├── ai/               # AI Classification, Deduplication & Matchmaking Engine
│   │   ├── cloudinary/       # Media Upload & Cloud Storage Handlers
│   │   ├── controllers/      # REST API Controllers (Auth, Problem, University, Industry, Analytics)
│   │   ├── data/             # Master District, Department & HEI Catalogs
│   │   ├── db/               # Database Connection & Seed Scripts
│   │   ├── email/            # Nodemailer Notification Handlers
│   │   ├── middleware/       # JWT Auth, Role Authorization & Upload Middleware
│   │   ├── models/           # Mongoose Schemas (User, Problem, Proposal, University, Industry, Location)
│   │   ├── routes/           # Express Route Definitions
│   │   └── server.js         # Main Server Entry Point
│   └── package.json
│
├── frontend/
│   ├── public/               # Static Assets & Jharkhand Emblems
│   ├── src/
│   │   ├── assets/           # UI Images and Illustrations
│   │   │   └── Images/       # Platform Screenshots & Showcase Gallery
│   │   ├── components/       # Stakeholder Portals, Modals & GIS Maps
│   │   │   ├── citizen/      # Problem Submission Modals & Citizen Portals
│   │   │   ├── common/       # Navbar, Footer, Problem Details Modal, AI Assistant
│   │   │   ├── community/    # Unified Citizen & Panchayat Dashboard
│   │   │   ├── gis/          # Interactive Leaflet 24-District Map
│   │   │   ├── government/   # Tripartite Sanction Desk & Triage Portals
│   │   │   ├── industry/     # CSR Partner Profile & Proposal Sponsorship
│   │   │   ├── layout/       # Main App Layout Container
│   │   │   └── university/   # University Lab Dashboard & Proposal Management
│   │   ├── config/           # API Endpoints Configuration
│   │   ├── context/          # StateContext for Global Telemetry
│   │   ├── pages/            # Top-Level Page Views
│   │   ├── services/         # Axios API Services (Auth, Problem, University, Industry, AI)
│   │   ├── store/            # Redux Slices (Auth, Ecosystem, UI)
│   │   ├── utils/            # Google Translate & Formatting Helpers
│   │   ├── App.jsx           # Master App Routing
│   │   ├── index.css         # Global Styles & Typography
│   │   └── main.jsx          # React DOM Root
│   ├── index.html            # HTML Shell with Google Translate Scripts
│   ├── vercel.json           # Vercel SPA Client Routing
│   └── package.json
│
└── README.md
```

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js** (v18.x or higher)
- **pnpm** (`npm install -g pnpm`)
- **MongoDB Atlas** database URI or local MongoDB instance

### 2. Clone the Repository
```bash
git clone https://github.com/Gopal-Kundu/Pragati-setu.git
cd Jharkhand-Pragati-Setu
```

### 3. Backend Setup
```bash
cd backend
pnpm install
```

Create a `.env` file inside `backend/`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
BHASHINI_USER_ID=your_bhashini_user_id
BHASHINI_API_KEY=your_bhashini_api_key
BHASHINI_INFERENCE_KEY=your_bhashini_inference_key
BHASHINI_PIPELINE_ID=your_bhashini_pipeline_id
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
```

Start the backend server:
```bash
pnpm run dev
```
Backend will be running on `http://localhost:5000`.

### 4. Frontend Setup
```bash
cd ../frontend
pnpm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
pnpm run dev
```
Frontend will be running on `http://localhost:5173`.

---

## 📡 API Reference Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user (Citizen, Panchayat, University, Industry, Government) |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive secure JWT cookie |
| `GET` | `/api/auth/me` | Private | Fetch currently authenticated user profile |
| `GET` | `/api/problems` | Public | Query problem statements with filters and pagination |
| `POST` | `/api/problems` | Public/Auth | Submit new challenge with multipart photos/videos |
| `GET` | `/api/problems/user/my` | Private | Fetch problems submitted by current user |
| `GET` | `/api/problems/proposals/tripartite-packages` | Private (Govt) | Fetch all proposals forwarded for government sanction |
| `PATCH` | `/api/problems/proposals/:id/govt-approve` | Private (Govt) | Approve & issue sanction order or decline proposal |
| `POST` | `/api/ai/triage` | Public/Auth | AI analysis, severity scoring, and domain classification |
| `POST` | `/api/ai/chat` | Public/Auth | Pragati AI interactive assistant query handler |
| `GET` | `/api/bhashini/languages` | Public | Supported Bhashini Indian languages & district catalog |
| `POST` | `/api/bhashini/asr-translate` | Public | Bhashini ULCA ASR (Speech-to-text) and NMT translation |
| `POST` | `/api/bhashini/extract-problem` | Public | Gemini AI speech understanding to extract problem title, description & location |
| `POST` | `/api/bhashini/voice-submit` | Public/Auth | 1-Click direct voice grievance submission |
| `GET` | `/api/universities/my` | Private (HEI) | Fetch logged-in university profile & proposals |
| `GET` | `/api/industry/my` | Private (Ind) | Fetch logged-in industry profile & offers |
| `GET` | `/api/industry/proposals` | Private (Ind) | Fetch domain-matched proposals for CSR funding |
| `PATCH` | `/api/industry/proposals/:id/respond` | Private (Ind) | Submit CSR grant offer or decline proposal |
| `GET` | `/api/analytics` | Public | State-wide innovation metrics and GIS hotspots |

---
