const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
}).then(() => {
    console.log('✅ Connected to MongoDB successfully');
    process.exit(0);
}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
});
