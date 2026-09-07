# HEALTHIET

Healthiet is a full-stack wellness platform with separate Admin, Mentor and Mentee experiences.

## Working MVP

- JWT registration and login
- Secure environment-based admin bootstrap
- Mentee, Mentor and Admin role-based access
- User/profile management and profile photos
- Mentor applications with admin approval/rejection
- Mentee-to-mentor assignment and mentor history
- Progress logging and mentor-authorized progress viewing
- Assigned mentor/mentee chat
- Admin user analytics and activity logs
- Password reset tokens with one-hour expiry
- BMI, calorie, workout and diet frontend tools
- MongoDB health check for deployment monitoring

## Stack

Node.js, Express 5, MongoDB/Mongoose, JWT, bcrypt, Multer, Nodemailer, vanilla HTML/CSS/JavaScript.

## Local setup

```bash
cd healthiet
npm install
cp .env.example .env
npm run dev
```

Set `MONGO_URI` and `JWT_SECRET`. To bootstrap the first admin, set `ADMIN_EMAIL` and a 12+ character `ADMIN_PASSWORD`.

## Verification

```bash
npm run test:syntax
npm test
```

## Production

The repository includes a Render blueprint. Production requires `MONGO_URI`, `JWT_SECRET`, and the admin bootstrap variables for first setup. SMTP variables are optional but required for password-reset email delivery.

Profile photo uploads use `UPLOAD_DIR`. Use persistent storage if uploaded files must survive host restarts/redeploys.
