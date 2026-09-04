# ReachInbox Assignment

A full-stack email scheduling application built with React, Express, PostgreSQL, Redis, BullMQ, and Ethereal Email.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Nodemailer
- Google OAuth

## Features

### Backend
- Google OAuth login
- Email scheduling
- Multiple recipients
- PostgreSQL persistence
- BullMQ delayed jobs
- Redis queue
- Email rate limiting
- Delay between emails
- Configurable worker concurrency
- Email status tracking
- Ethereal Email integration

### Frontend
- Google login
- Dashboard
- Email composer
- Multiple recipients
- Scheduled emails table
- Sent emails table
- Email status tracking
- Scheduling controls
- Delay configuration
- Hourly email limit
- Logout

## Architecture

```text
Frontend
   |
   v
Express Backend
   |
   +---------> PostgreSQL
   |
   +---------> Redis
                  |
                  v
               BullMQ
                  |
                  v
             Email Worker
                  |
                  v
             Ethereal SMTP
