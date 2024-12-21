const mongoose = require('mongoose')
require('dotenv').config();

const connectDB = () =>{
    const MONGO_URI = process.env.MONGO_URI;  

    if (!MONGO_URI) {
        console.error("MONGO_URI is not defined in the .env file");
        return;
    }
    mongoose.connect(MONGO_URI).then(() => {
        console.log("MongoDB Connected");
    }).catch(err => {
        console.log(err);
    });
}

module.exports = connectDB