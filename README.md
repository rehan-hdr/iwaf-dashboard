# Dashboard Project

A Next.js dashboard application with MongoDB integration.

## 🚀 Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure MongoDB URI
**📍 IMPORTANT: Put your MongoDB connection string in `.env.local`**

The `.env.local` file is located in the root directory. Edit it and add your connection string:

For MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database?retryWrites=true&w=majority
```

For local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/your-database-name
```

### 3. Update Database Configuration
Edit `app/api/data/route.js`:
- **Line 6**: Replace `'your-database-name'` with your actual database name
- **Line 10**: Replace `'your-collection-name'` with your actual collection name

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
dashboard/
├── app/
│   ├── api/
│   │   └── data/
│   │       └── route.js       # API endpoint for MongoDB data
│   ├── page.js                # Main dashboard page (client component)
│   ├── layout.js              # Root layout
│   └── globals.css            # Global styles
├── lib/
│   └── mongodb.js             # MongoDB connection utility with pooling
├── .env.local                 # Environment variables ⚠️ DO NOT COMMIT
└── package.json
```

## ✨ Features

- ✅ Simple dashboard with dummy stats and action buttons
- ✅ MongoDB integration with connection pooling
- ✅ API route to fetch data from MongoDB
- ✅ Responsive design with Tailwind CSS
- ✅ Clean, maintainable code structure
- ✅ Error handling and loading states

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
