# VoltPlugEV — EV Charging Pre-Booking Platform

VoltPlugEV is a full-stack EV Charging Pre-Booking Platform designed to simplify the EV charging experience through realtime booking workflows, live navigation tracking, secure payment integration, and role-based operational management.

The platform enables EV users to discover nearby charging stations, request charging slots, receive realtime approval updates from station owners, complete secure payments, and navigate to stations through live route tracking.

---

# Features

## User Features

- User authentication and JWT-based authorization
- Nearby EV charging station discovery
- Interactive map-based station visualization
- Slot-based charging booking system
- Realtime booking approval updates
- Secure Razorpay payment integration
- Live route navigation and tracking
- Booking history and status management

---

## Station Master Features

- Dedicated station management dashboard
- Realtime booking request handling
- Approve / Reject booking workflow
- Slot availability monitoring
- Booking management and operational control

---

## Admin Features

- Centralized admin dashboard
- User management system
- Station management system
- Booking analytics and monitoring
- Revenue and platform activity tracking
- Realtime platform-wide updates using Socket.IO

---

# Live Tracking & Navigation

VoltPlugEV integrates:

- Leaflet for interactive map rendering
- OpenStreetMap for open-source geographical map data
- OSRM for shortest-path route calculation and navigation

This enables realtime route visualization between users and charging stations.

---

# Payment Integration

The platform uses Razorpay for secure online payment processing.

Features include:

- Payment order creation
- Backend payment verification
- Secure transaction handling
- Realtime payment status updates

---

# Tech Stack

## Frontend

- React.js
- TypeScript
- Tailwind CSS
- React Router
- Vite

## Backend

- Node.js
- Express.js

## Database

- MongoDB
- Mongoose

## Realtime Communication

- Socket.IO

## Authentication

- JWT Authentication

## Maps & Navigation

- Leaflet
- OpenStreetMap
- OSRM

## Payments

- Razorpay

---

# System Workflow

```text id="m4v8k2"
User Searches Station
        ↓
Booking Request Created
        ↓
Station Master Reviews Request
        ↓
Approve / Reject Booking
        ↓
User Completes Payment
        ↓
Realtime Navigation Tracking
        ↓
Admin Monitors Platform Analytics
```

---

# Screenshots

## Home Page

(Add Screenshot Here)

## Station Discovery & Maps

(Add Screenshot Here)

## Booking Workflow

(Add Screenshot Here)

## Station Master Dashboard

(Add Screenshot Here)

## Razorpay Payment Integration

(Add Screenshot Here)

## Live Navigation Tracking

(Add Screenshot Here)

## Admin Dashboard

(Add Screenshot Here)

---

# Security Features

- JWT-based protected routes
- Role-based authorization
- Secure backend payment verification
- Protected API endpoints
- Environment variable configuration for secrets

---

# Realtime Features

Socket.IO enables:

- instant booking synchronization
- realtime approval updates
- live admin monitoring
- seamless dashboard communication

without requiring manual refreshes.

---

# Project Architecture

The platform follows a modular MERN architecture with:

- reusable frontend components
- scalable backend controllers/services
- REST API communication
- realtime event-driven updates

---

# Installation

## Clone Repository

```bash id="x7m2v5"
git clone https://github.com/YOUR_USERNAME/VoltPlugEV.git
```

---

## Backend Setup

```bash id="q4m8v1"
cd backend
npm install
npm run dev
```

---

## Frontend Setup

```bash id="n6m3v8"
cd frontend
npm install
npm run dev
```

---

# Environment Variables

Create a `.env` file inside backend:

```env id="v1p9c7"
MONGO_URI=YOUR_MONGODB_URI
JWT_SECRET=YOUR_SECRET
RAZORPAY_KEY_ID=YOUR_KEY
RAZORPAY_KEY_SECRET=YOUR_SECRET
```

---

# Future Scope

- AI-based charging station recommendation
- Smart slot prediction system
- IoT-based live charger monitoring
- EV battery analytics
- Mobile application support
- Dynamic pricing system

---

# Developed By

Naman Thakkar

LinkedIn:
https://www.linkedin.com/in/naman-thakkar-82163233b/

GitHub:
https://github.com/Naman-Thakkar-2906

---

# Project Highlights

- Full-stack MERN application
- Realtime Socket.IO workflows
- Razorpay payment integration
- Live map tracking system
- Role-based dashboards
- Admin analytics system
- Production-oriented architecture
