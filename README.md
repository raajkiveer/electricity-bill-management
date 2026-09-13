# Electricity Bill Generation System

A web-based electricity bill management system built with Node.js, Express, MySQL, HTML, CSS, and JavaScript.

## Features

- User authentication and registration
- Role-based access (Admin and User)
- Consumer management
- Bill generation
- Payment processing
- Payment history tracking

## Prerequisites

- Node.js (v14 or higher) - Download from https://nodejs.org/
- MySQL Server
- npm (comes with Node.js)

## Installation

1. Clone or download the project files.

2. Navigate to the project directory:
   ```
   cd electricity-web
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up the MySQL database:
   - Create a database named `electricity_db1`
   - Run the SQL script in `schema.sql` to create tables
   - Update database credentials in `server.js` or set environment variables:
     - ELECTRICITY_DB_HOST
     - ELECTRICITY_DB_USER
     - ELECTRICITY_DB_PASSWORD
     - ELECTRICITY_DB_NAME

5. For the default admin user, the password in schema.sql is a placeholder. In a real application, use proper password hashing.

## Running the Application

1. Start the server:
   ```
   npm start
   ```
   Or for development with auto-restart:
   ```
   npm run dev
   ```

2. Open your browser and go to `http://localhost:3000`

## Usage

1. Register a new account or login with existing credentials
2. Admin users can manage all consumers and view all payment history
3. Regular users can only see their own consumers and payments
4. Add consumers, generate bills, and process payments through the dashboard

## Database Schema

The application uses the following tables:
- Login: User authentication
- Consumer: Consumer information
- Meter: Meter details
- Reading: Electricity readings
- Bill: Bill information
- Payment: Payment records
- UserConsumer: Mapping between users and consumers

## Security Notes

- Passwords are hashed using bcrypt
- Sessions are used for authentication
- In production, use HTTPS and secure session secrets
- Validate and sanitize all user inputs