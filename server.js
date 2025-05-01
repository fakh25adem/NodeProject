const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config()
const cors = require('cors');
const authRoutes = require('./Routes/auth');
const userRoutes = require('./Routes/user');
const appRoutes = require('./Routes/appointment');

const app = express();
app.use(cors());

app.use(express.json())
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/appointment", appRoutes);

const PORT = process.env.PORT || 4600
mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log('connecting to Database')
}).catch(err=>{
    console.log('error connecting to Database',err)
})

app.listen(PORT,()=>{
    console.log('listening on port 4600' )
})