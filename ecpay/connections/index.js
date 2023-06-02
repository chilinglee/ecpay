const mongoose = require('mongoose');

const DB = process.env.DBPATH.replace('<password>', process.env.PASSWORD);

mongoose.connect(DB).then(() => console.log('Database connected'));
