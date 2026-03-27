

# Professional Portfolio Website — Mauricio Marcon Teles

## Vision
A consulting-firm-inspired portfolio website that positions you as a credible, experienced full-stack developer with AI expertise — targeting startup founders who value technical depth, reliability, and business acumen. The design will mirror the structured, polished aesthetic of firms like McKinsey or Deloitte digital presences: clean layouts, professional navy/slate color palette, sophisticated typography, and clear information hierarchy.

---

## 1. Public Pages

### Homepage
- **Hero Section**: Your name, title ("Technical Project Manager | Solutions Architect | AI Developer"), a concise professional tagline, and your photo
- Call-to-action buttons: "View My Work" and "Download Resume"
- LinkedIn & GitHub icon links prominently displayed
- **Professional Bio**: A structured "About" section drawn from your LinkedIn summary — emphasizing your 15+ years in consulting, people/process development philosophy, and AI pivot. Presented with key stats or highlight cards (e.g., "15+ Years Consulting", "Full-Stack + AI")
- **Timeline / Experience**: Vertical timeline showcasing your career history and education (Hult, consulting roles, etc.), with distinct visual markers for work vs. education entries. Each entry: title, organization, date range, and description — structured to mirror LinkedIn's content format for easy population

### Projects Page
- **Card grid layout** with project thumbnail, title, short description, and category tags
- **Tag-based filtering** (e.g., "Machine Learning", "Full-Stack", "Data Science", "Computer Vision")
- **Search bar** for text-based search across project names and descriptions
- Pagination for browsing 10+ projects efficiently

### Project Detail Page
- Full project write-up: title, detailed description, key features list
- **Media gallery** for screenshots and videos (stored in Supabase Storage)
- Tags/categories display
- External links (live demo, GitHub repo)

### Contact Page
- **Contact form** with fields: Name, Email, Subject, Message
- Client-side validation with Zod, honeypot spam protection, and rate limiting
- Messages stored in Supabase for you to review via admin panel
- **Social links section**: LinkedIn, GitHub, Email displayed prominently

---

## 2. Resume Download
- PDF resume stored in Supabase Storage
- Download button in hero section and navigation bar
- Admin can upload/replace the resume file anytime

---

## 3. Admin Panel (Password-Protected)

### Secure Authentication
- Supabase Auth with email/password login
- User roles table (separate from profile) with admin role check
- Protected routes that redirect unauthenticated users to login page
- Server-side role validation — no client-side security shortcuts

### Content Management Dashboard
- **Projects Manager**: Full CRUD for projects — title, description, feature list, tags, media uploads, external links, display ordering
- **Timeline Manager**: Add/edit/delete experience and education entries with dates, descriptions, and type classification
- **Profile Editor**: Update your bio, tagline, hero content, social links, and photo
- **Resume Upload**: Upload or replace your PDF resume with file validation
- **Contact Messages Inbox**: View submitted contact messages with read/unread status

### Media Upload Handling
- Image uploads with file type validation (JPEG, PNG, WebP) and size limits
- Preview before upload
- All media stored in Supabase Storage buckets with proper access policies

---

## 4. Supabase Backend

### Database Schema
- **profiles** — Bio, tagline, photo URL, social links, hero content (single row)
- **projects** — Title, description, features (JSON), tags, external links, sort order, timestamps
- **project_media** — File URLs linked to projects (references Storage bucket)
- **timeline_entries** — Title, organization, date range, description, type (work/education), sort order
- **contact_messages** — Name, email, subject, message, timestamp, read status
- **user_roles** — Separate roles table with admin role enum for secure access control

### Row-Level Security
- Public read access for profiles, projects, project_media, and timeline_entries
- Admin-only write access validated via `has_role()` security definer function
- Contact messages: public insert (for form submissions), admin-only read
- User roles: admin-only access

### Storage Buckets
- **project-media** — Public read, admin-only upload for project screenshots/videos
- **resume** — Public read (for download), admin-only upload

### Edge Function
- Contact form submission handler with server-side validation and spam protection

---

## 5. Design System

### Visual Language
- **Color palette**: White/light gray backgrounds, navy (#1B2A4A) and slate blue accents, subtle warm grays for text hierarchy — consulting-firm inspired
- **Typography**: Clean, professional sans-serif fonts with clear weight hierarchy (bold headings, regular body)
- **Layout**: Generous whitespace, structured grid layouts, card-based project displays
- **Animations**: Subtle fade-in and slide-up on scroll — polished but understated

### Responsive Design
- Fully responsive across mobile, tablet, and desktop
- Mobile hamburger navigation menu
- Touch-friendly cards and timeline on smaller screens
- Optimized for both recruiter desktop review and mobile browsing

### Navigation
- Sticky top navbar: Home, Projects, Contact
- Smooth scroll anchors for Bio and Timeline sections on homepage
- Admin link (visible only when authenticated)

---

## Pages Summary
1. **Home** — Hero, Bio, Timeline/Experience
2. **Projects** — Filterable & searchable project gallery
3. **Project Detail** — Individual project deep-dive
4. **Contact** — Form + social links
5. **Admin Login** — Secure authentication
6. **Admin Dashboard** — Full content management (projects, timeline, profile, resume, messages)

