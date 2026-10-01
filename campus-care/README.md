# Campus Care: Centralized Campus Issue Reporting and Lost & Found Management System

> **IPS Project** &bull; An intelligent, client-side web application for managing campus lost-and-found items and reporting campus infrastructure issues.

---

## 1. Problem Statement & Overview

On college campuses, lost-and-found items and infrastructure issues (such as electrical faults, plumbing leaks, and broken furniture) are often reported through scattered WhatsApp groups, unstructured emails, or word-of-mouth with no centralized tracking. This results in:
- Unclaimed items remaining lost or piling up at security desks.
- Infrastructure issues going unresolved due to lack of accountability and departmental routing.
- Students having no visibility into whether their lost items were recovered or their complaints were addressed.

**Campus Care** solves this by providing a unified, role-based web portal that automates lost-and-found matching, routes campus issues to the appropriate maintenance department, offers real-time status tracking with audit history, and equips administrators with tools to verify claims securely and manage resolutions.

---

## 2. Key Features

- **Role-Based Authentication**:
  - Distinct entry portals and credentials for **Students** and **Administrators**.
  - URL route protection (unauthorized access to admin pages automatically redirects to login).
- **Report Submission with Unique IDs**:
  - **Report Lost Item**: Submits lost item details generating a tracking ID (`LOST-XXXXX`).
  - **Report Found Item**: Submits found item details with a secure, private owner verification detail (`FOUND-XXXXX`).
  - **Report Campus Issue**: Submits campus infrastructure defects (`ISSUE-XXXXX`).
- **Automated Bi-directional Item Matching**:
  - Matching engine compares category, keywords, location, and dates across lost and found entries.
  - When a match is found, both reports are automatically updated to `Match Found` with audit history cross-referencing each other's ID.
- **Automated Department Routing for Campus Issues**:
  - Categorized issues are automatically assigned to responsible campus divisions:
    - *Electricity* &rarr; Electrical Maintenance & Power Division
    - *Plumbing* &rarr; Water Supply & Plumbing Department
    - *Cleanliness* &rarr; Sanitation & Housekeeping Team
    - *Furniture* &rarr; Campus Infrastructure & Carpentry Division
    - *Wi-Fi* &rarr; IT Support & Network Operations Center (NOC)
    - *Other* &rarr; Campus Facilities & Administration
- **Track Status & Timeline Audit History**:
  - Search any Report ID to view full report metadata and a step-by-step chronological timeline log of every status change and administrative remark.
- **Admin Operations Dashboard**:
  - Filter reports by category tab (All, Lost, Found, Campus Issues), status dropdown, or search query.
  - **Claim Verification**: Review secret, owner-only details provided by finders to verify student ownership before releasing items.
  - **Status Updates with Remarks**: Update report statuses with custom administrative notes.
  - **Privacy & Security**: Student phone numbers and item custody location ("Kept at") are protected and visible **only** on admin management pages.
- **30-Day Auto-Expiry**:
  - Unclaimed lost and found items older than 30 days are automatically marked as `Expired` (campus issues are excluded).
- **First-Visit Demo Data**:
  - Automatically loads 5 realistic sample reports on first visit without overwriting user data.
- **Responsive Mobile-First Design**:
  - Fully responsive across mobile (320px+), tablet, and desktop viewports with accessible $\ge 44\text{px}$ touch targets, collapsible navigation, and responsive stacked cards in the admin dashboard.

---

## 3. Status Reference & Applicability

The portal supports distinct lifecycle statuses tailored to report types:

| Status | Applicable Report Type | Description |
| :--- | :--- | :--- |
| **`Open`** | Lost Items, Found Items, Campus Issues | Report has been submitted and is awaiting initial action or matching. |
| **`Match Found`** | Lost Items, Found Items | Potential match detected between a lost report and a found report. |
| **`Returned`** | Lost Items, Found Items | Ownership verified by admin and item successfully returned to owner. |
| **`Expired`** | Lost Items, Found Items | Unclaimed after 30 days; item transferred to campus administration. |
| **`Assigned`** | Campus Issues | Issue automatically routed and assigned to the relevant campus department. |
| **`In Progress`** | Campus Issues | Maintenance team or technician is actively working on the repair. |
| **`Resolved`** | Campus Issues | Issue has been fixed, tested, and marked complete by administration. |

---

## 4. Demo Login Accounts

These hardcoded accounts are available for demonstration and testing:

### Student Accounts
- **Username**: `student` &bull; **Password**: `CampusCare@Student26` *(Alex Smith - 21CS042)*
- **Username**: `alex` &bull; **Password**: `CampusCare@Student26` *(Alex Smith - 21CS042)*

### Admin Accounts
- **Username**: `admin` &bull; **Password**: `CampusCare@Admin26` *(Campus Care Administrator)*
- **Username**: `admin2` &bull; **Password**: `CampusCare@Admin26` *(Facilities Admin Officer)*

> *Note: These are simulated client-side accounts for demo purposes.*

---

## 5. How to Run & Reset

### Running the Application
No build tools, npm packages, or compilers are required.

1. **Direct Browser**: Open [index.html](file:///c:/Users/satya/OneDrive/Documents/projects/campus-care/index.html) in any modern web browser (Chrome, Edge, Firefox, Safari).
2. **Local HTTP Server** *(Optional)*:
   ```bash
   # Using Python 3
   cd campus-care
   python -m http.server 8000
   ```
   Navigate to `http://localhost:8000/index.html` in your browser.

### How to Reset Demo Data
If you want to clear custom reports and restore the original 5 demo records:
1. Open Developer Tools in your browser (`F12` or `Ctrl+Shift+I`).
2. Go to the **Console** tab and run:
   ```javascript
   localStorage.removeItem('campusCare_reports');
   ```
3. Refresh the page (`F5`). The default demo dataset will be re-initialized.

---

## 6. Technology Stack

- **Structure**: Semantic HTML5 with accessibility attributes (`aria-expanded`, mobile viewports, semantic landmarks).
- **Styling**: Vanilla CSS3 using custom CSS variables (Design System tokens), CSS Grid, and Flexbox for responsiveness.
- **Logic**: Vanilla JavaScript (ES6+ Modules, DOM APIs, Regular Expressions, Date manipulation).
- **Persistence**: Browser `localStorage` for cross-page report storage and `sessionStorage` for active user session management.

---

## 7. Known Limitations

- **Browser-Local Storage**: Data is persisted in the browser's `localStorage` and does not synchronize across different devices or browsers.
- **Client-Side Simulation**: Authentication, role authorization, and toast notifications are executed client-side without an external backend or database server.
- **No File Upload Backend**: Images and attachments are simulated through detailed text descriptions and secret verification phrases.

---

## 8. Development Note

This project was designed and built with **AI assistance** using Google Antigravity IDE pair-programming workflows.
