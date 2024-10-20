const mongoose = require('mongoose');
const ListSchema = new mongoose.Schema({
     title:{
        type:String,
        required:true,
        minLength:1,
        trim:true
     },
   _userId:{
       type:mongoose.Types.ObjectId,
       required:true
   }


    //  tasks:[
    //     {
    //         type:mongoose.Types.ObjectId,
    //         ref:'Task'
    //     }
    //  ]
})

const List = mongoose.model('List',ListSchema);
module.exports = {List}
