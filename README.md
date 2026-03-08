# 🎒 Campus Lost & Found System

## A full-stack web application for reporting, searching, and managing lost and found items on campus.

This project is a complete web system built to help students and staff report and recover lost belongings within the campus.  
It allows users to report lost or found items, search items, view hotspots on a campus map, and manage their own reports.

The system improves item recovery efficiency and reduces the time required to locate lost belongings.

---

# 🌐 Live Demo

You can try the system here:

👉 https://campus-lost-found-lwt4.onrender.com

No installation is required. Simply open the link in your browser.

---

# 🚀 Features

The system includes the following features:

• User registration and login authentication  
• Report lost items  
• Report found items  
• Upload item photos  
• Search and filter lost/found items  
• Interactive campus map with location hotspots  
• View item details  
• Edit or delete personal reports  
• Dashboard with item statistics  
• User profile and password management  

---

# 🖥️ System Overview

The Campus Lost & Found System allows students to:

1. Create an account and log in
2. Report a lost or found item
3. Upload images of the item
4. Search for items reported by other users
5. View items on an interactive campus map
6. Manage their own reports through a personal dashboard

This system helps connect students who lost items with those who found them.

---

# 🧱 Tech Stack

## Frontend
• HTML5  
• CSS3  
• JavaScript  

## Backend
• Node.js  
• Express.js  

## Database
• MySQL  

## Media Storage
• Cloudinary (for image uploads)

## Other Tools
• Express Session (authentication)
• REST API architecture

---

# 📂 Project Structure

```
project-root/
│
├── index.html
├── login.html
├── register.html
├── home.html
├── lost.html
├── found.html
├── report.html
├── maps.html
├── details.html
├── myreports.html
├── settings.html
│
├── style.css
├── script.js
│
├── server.js
├── db.js
├── cloudinary.js
│
├── routes/
│   ├── auth.js
│   └── items.js
│
└── uploads/
```

---

# 🔐 Authentication

The system uses **session-based authentication**.

Authentication features include:

• User registration  
• Login validation  
• Secure session cookies  
• Logout functionality  
• Protected API routes  

---

# 📦 API Endpoints

## Authentication Routes

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
PUT /api/auth/profile
PUT /api/auth/change-password
```

## Item Routes

```
GET /api/items
GET /api/items/:id
POST /api/items
PUT /api/items/:id
DELETE /api/items/:id
```

These APIs allow the frontend to communicate with the backend database.

---

# 🗺️ Map Overview Feature

The system includes an **interactive campus map** showing item hotspots.

Map features:

• Pins placed on item locations  
• Heatmap visualization of lost/found areas  
• Floor selection (Ground Floor / Level 3 / Level 4)  
• Tooltip showing item statistics  
• Quick navigation to filtered items  

This helps users identify common locations where items are lost.

---

# 📊 Dashboard

The dashboard displays system statistics such as:

• Total reports  
• Lost items  
• Found items  
• Active items  

These statistics help users quickly understand item activity on campus.

---

# 📷 Image Upload

Users can upload item images when creating reports.

Supported formats:

```
JPG
PNG
WEBP
```

Maximum file size:

```
3MB
```

Images are stored using **Cloudinary cloud storage**.

---

# ⚙️ Installation Guide

To run the project locally:

### 1. Clone the repository

```
git clone https://github.com/yourusername/lost-found-system.git
```

### 2. Navigate to the project folder

```
cd lost-found-system
```

### 3. Install dependencies

```
npm install
```

### 4. Configure environment variables

Create a `.env` file and add:

```
SESSION_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 5. Start the server

```
node server.js
```

Server will run on:

```
http://localhost:3000
```

---

# 👨‍💻 Author

Developed as part of a university web development project.

Student: Ong Jia Jie  
University: Quest International University (QIU)  
Course: Web Technology (BCS)

---

# 📜 License

This project is created for **educational purposes only**.