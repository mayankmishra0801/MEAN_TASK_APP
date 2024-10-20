const mongoose = require('mongoose')
const connectDB = (MONGO_URI) =>{
    try{
        mongoose.connect(MONGO_URI).then(()=>{
            console.log("MongoDB Connected")

        }).catch(err => {
            console.log(err)
        })

    }

    catch(error){
        console.log(error)
    }
}

module.exports = connectDB