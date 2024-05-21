const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const groupRoutes = require('./routes/group');
const resourceRoutes = require('./routes/resource');
const projectRoutes = require('./routes/project');
const activityRoutes = require('./routes/activity');

// const patientRoutes = require('./routes/patient');
// const itemRoutes = require('./routes/item');
// const formulaRoutes = require('./routes/formula');
// const appointmentRoutes = require('./routes/appointment');
// const treatmentRoutes = require('./routes/treatment');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }));

mongoose.connect(process.env.MONGO_URL, {
    dbName: process.env.MONGO_DBNAME,
  })
    .then(() => {
      console.log('Database connected');
    })
    .catch((e) => {
      console.log('Database not connected due to error, ', e);
    });

const PORT = process.env.SERVER_PORT || 8000;

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/group', groupRoutes);
app.use('/resource', resourceRoutes);
app.use('/project', projectRoutes);
app.use('/activity', activityRoutes);
// app.use('/patient', patientRoutes);
// app.use('/item', itemRoutes);
// app.use('/formula', formulaRoutes);
// app.use('/appointment', appointmentRoutes);
// app.use('/treatment', treatmentRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});