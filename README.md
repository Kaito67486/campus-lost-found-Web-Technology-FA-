Campus Lost and Found Management System
1. Project Overview

The Campus Lost and Found Management System is a web-based application developed to help students and staff report, manage, and track lost and found items within the campus environment.

The system provides a centralized platform where users can:

Submit lost or found item reports

View reported items

Track item status

Manage their own submissions

View item distribution through a building map interface

This project was developed as part of a web development assignment to demonstrate full-stack application design, database integration, and user authentication.

2. Objectives

The main objectives of this system are:

To provide a structured platform for reporting lost and found items.

To allow users to manage and edit their own reports.

To implement secure user authentication.

To organize items by category and location.

To visualize item hotspots using campus building maps.

To apply front-end and back-end integration using RESTful APIs.

3. System Features
3.1 User Authentication

User registration

User login and logout

Session-based authentication

Protected routes for logged-in users

Only authenticated users can submit, edit, or delete reports.

3.2 Dashboard

The dashboard displays:

Total reports

Total lost items

Total found items

Active items

Recent reports

This provides users with a quick summary of system activity.

3.3 Report Lost / Found Item

Users can:

Submit a new lost or found report

Upload an image of the item

Select item category (Lost / Found)

Select location from dropdown menu

Enter date and contact information

Set status (Active / Claimed / Resolved)

When editing a report, the original data is automatically displayed in the form.

3.4 Item Details Page

Each item has a dedicated details page that displays:

Item title

Reference code

Category

Location

Date

Description

Contact information

Image preview

Current status

If the logged-in user is the owner of the item, additional actions are available:

Edit report

Change status

Delete report

3.5 My Reports

The "My Reports" page allows users to:

View only the reports they created

Edit their reports

Update item status

Delete reports

This ensures user-specific content management.

3.6 Map Overview

The system includes a Map Overview feature for the TTS Building, which contains:

Ground Floor map

Level 3 map

Level 4 map

Users can:

Switch between floors

View item count by location

Click a location to filter items by that area

This feature helps visualize item hotspots within the campus.

4. Technologies Used
Frontend

HTML5

CSS3

Vanilla JavaScript

Backend

Node.js

Express.js

RESTful API design

Database

MySQL

Additional Tools

Multer (for image upload handling)

Express-session (for authentication)

JSON-based API responses

5. System Architecture

The system follows a client-server architecture:

The frontend sends requests using Fetch API.

The backend (Express server) processes the request.

The database stores and retrieves item and user data.

JSON responses are returned to the frontend.

The frontend dynamically updates the user interface.

6. Database Design

The database contains two main tables:

Users Table

id

name

email

password (hashed)

created_at

Items Table

id

title

description

category (Lost / Found)

location

date

contact

status

imagePath

ownerUserId

createdAt

This structure ensures proper relationship between users and their submitted items.

7. Security Implementation

The system implements:

Session-based authentication

Route protection middleware

User ownership verification before editing or deleting items

Input validation on both client and server side

8. Challenges Faced

During development, several challenges were encountered:

Handling dynamic image previews

Managing edit mode and create mode within the same form

Fixing incorrect route redirection

Ensuring correct image path loading for building maps

Maintaining consistent layout across multiple pages

These challenges were resolved through debugging, route refactoring, and structural improvements.

9. Future Improvements

The system can be enhanced further by adding:

Admin dashboard

Advanced filtering and search options

Email notifications for matched items

Interactive clickable map hotspots

Pagination for large item datasets

AI-based image matching system

10. Conclusion

The Campus Lost and Found Management System successfully demonstrates the integration of frontend and backend technologies to build a functional web application.

The system fulfills the assignment objectives by:

Implementing user authentication

Managing database-driven content

Handling image uploads

Providing dynamic UI updates

Visualizing location-based data

This project reflects practical understanding of full-stack web development concepts and RESTful architecture.

udpdate github
git add .
git commit -m "Updated feature"
git push

Aizen free Service name mysql-2d48a2d7