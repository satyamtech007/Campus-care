# Campus Care

A centralized campus issue reporting and lost & found management system built for college students and administrators.

## Live Demo

https://satyamtech007.github.io/Campus-care/campus-care/

## Features

### Student Portal

- Register and Login (Email/Password + Google Sign-In)
- Report Lost Items with unique tracking ID
- Report Found Items with private owner verification
- Report Campus Maintenance Issues with auto department routing
- Photo Attachment on issue reports for visual proof
- Upvote / Me Too button to highlight common issues
- My Reports — personal report history
- Track Report Status using Report ID
- Student Profile with photo upload
- Dark/Light mode toggle

### Admin Portal

- Secure Admin Login (Google Sign-In whitelisted)
- Admin Dashboard with real-time report management
- View attached issue photos directly in the dashboard
- Update report statuses (Open, Match Found, In Progress, Resolved)
- Verify found item claims with secret detail verification
- Audit trail for all status updates with full timeline
- Admin Profile with photo upload and performance metrics

## Tech Stack

- HTML, CSS, JavaScript
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Hosted on GitHub Pages

## Project Structure

- index.html — Portal selection
- login.html — Login page
- register.html — Student registration
- lost.html — Report lost item
- found.html — Report found item
- issue.html — Report campus issue
- track.html — Track report status
- myreports.html — My reports history
- profile.html — Student profile
- admin.html — Admin dashboard
- admin-profile.html — Admin profile
- firebase-client.js — Firebase config and helper functions
- style.css — Global stylesheet
- issue.js — Issue reporting logic
- lost.js — Lost item logic
- found.js — Found item logic
- track.js — Track status logic
- admin.js — Admin dashboard logic