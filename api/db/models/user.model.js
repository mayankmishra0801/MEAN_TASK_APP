const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
 const jwtSecret = "6738934782389hjdfsdfjfj89348484";

const UserSchema = new mongoose.Schema({
   
    email:{
        type:String,
        required:true,
        trim:true,
        trim:true,
        unique:true,
        minlength:1,

    },
    password:{
        type:String,
        required:true,
        minlength:8
    },

    session:[
        {
            token:{

              type:String,
              required:true
            },
            expiresAt:{
                type:Number,
                required:true
            }
        }
    ],
    default:[]

});
// instance method
   
UserSchema.methods.toJson = function(){
    
    const user = this;
    const userObject = user.toObject();
    //return the document except the passowd and session,this sould not be public
    // delete userObject.password;
    // delete userObject.session;
    return _.omit(userObject,['password','session']);


}

UserSchema.methods.generateAccessAuthToken = function(){
   
    const user = this;
    return new Promise((resolve,reject)=>{
         // create JSWON WEB TOKEN AND RETURN THAT
         jwt.sign({_id:user._id.toHexString()},jwtSecret,{expiresIn:'15m'},(err,token)=>{
             if(!err){
                 resolve(token);

             } else{
                //there is an error
                reject();
             }
         })

    })

}

UserSchema.methods.generateRefreshAuthToken = function(){
  return new Promise((resolve,reject)=>{
     crypto.randomBytes(64,(err,buffer)=>{
         if(!err){
             //use crypto to create a hash
             let token = buffer.toString('hex');
              return  resolve(token);
         } 
         
         else{
             reject(err);
         }
     })
      
      // this method simply generate hex string of 64byte, it doesnot save it to database , saveSessionToDatabase() does that

  })


}

UserSchema.methods.createSession = function(){

   let user = this;
   return user.generateRefreshAuthToken().then((refreshToken)=>{
      return saveSessionToDatabase(user,refreshToken); 
   }).then((refreshToken)=>{
      return refreshToken;
   }).catch((e)=>{
    return Promise.reject('Failed to save session to database.\n' + e);
   })

}

//model method {static method}
 UserSchema.statics.getJWTSecret = ()=>{
     return jwtSecret;
 }



UserSchema.statics.findByIdAndToken = function(_id,token){

   
    const User = this;
    return User.findOne({_id,'sessions.token':token}); 


}

UserSchema.statics.findByCredentials = function(email,password){
  
    let User = this;
    return User.findOne({email}).then((user)=>{
         if(!user) return Promise.reject();

         return new Promise((resolve,reject)=>{
            bcrypt.compare(password,user.password,(err,res)=>{
                if(res) resolve(user);
                else{
                    reject();
                }
            })
         })
    })
   
    
}

UserSchema.statics.hasRefreshTokenExpired = function(expiresAt){
let secondsSinceEpoch = Date.now()/1000;
if(expiresAt > secondsSinceEpoch){
    //has not expired
    return false;
}else{
    //has expired
     return true;
}

}

//middleware
UserSchema.pre('save',function(next){

    let user = this;
    let costFactor = 10;

     if(user.isModified('password')){
          
           // if the password field has been edited/changed then runthis code

           bcrypt.genSalt(costFactor,(err,salt)=>{
               bcrypt.hash(user.password,salt,(err,hash)=>{
                  user.password = hash;
                  next();
               })
           })

     }else{
        next()
     }




})


//Helper method
let saveSessionToDatabase = (user,refreshToken) =>{

    return new Promise((resolve,reject)=>{
       
        let expiresAt = generateRefreshTokenExpiryTime();

        if(!user.sessions){
           user.sessions = []; 
        }
        // user.session = user.session || [];
        user.sessions.push({'token':refreshToken,expiresAt});

        user.save().then(() =>{
            // saved session successfully
            return resolve(refreshToken);

        }).catch((e)=>{
            reject(e);
        })

    })



}

let generateRefreshTokenExpiryTime=()=>{
    let dayUntilExpire = "10";
    let secondsUntilExpire = ((dayUntilExpire * 24) * 60) * 60;
    // let secondsUntilExpire =15;
    return ((Date.now()/1000) + secondsUntilExpire);

}

const User = mongoose.model('User',UserSchema); 

module.exports = {User}