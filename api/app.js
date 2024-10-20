const express = require('express')
const cors= require('cors');
const app = express();

// const {mongoose} = require('./db/mongoose');

const  dotenv = require("dotenv");

const mongoose = require("mongoose");

dotenv.config();
const connectDB = require('./config/task')

const MONGO_URI = process.env.MONGO_URI
connectDB(MONGO_URI)



const bodyParser = require('body-parser');

// const  {List} = require('./db/models/list.model')
// const {Task} = require('./db/models/task.model')

const {List,Task,User} = require('./db/models');
const jwt = require('jsonwebtoken');



//load middleware

app.use(bodyParser.json());
app.use(cors({origin:'*'}));




// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "YOUR-DOMAIN.TLD"); // update to match the domain you will make the request from
//      res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE.PATCH");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,_id, Accept,x-access-token,x-refresh-token,X-Requestedwith");
     
//     res.header('Access-Control-Expose-Headers', 'x-access-token,x-refresh-token');
    
//     next();
//   });

  //check whether the request has valid jwt token 

  let authenticate = (req,res,next) => {
    let token = req.header('x-access-token');  
    //verify the jwt
    jwt.verify(token,User.getJWTSecret(),(err,decoded)=>{
        if(err){
            res.status(401).send(err);

        }else{
            req.user_id = decoded._id;
            next()
        }
    }) 

  }



let verifySession = (req,res,next)=>{


// }


//middleware
//verify refreshtoken  middleware which will verify the session
// app.use((req,res,next) => {
    
    let refreshToken = req.header('x-refresh-token');
    // let accessToken = req.header('x-access-token');

    let _id = req.header('_id');

    User.findByIdAndToken(_id,refreshToken).then((user)=>{
       if(!user){
        return Promise.reject({
            "error":"User Not Found. Make sure that the refresh token and user id are correct"
        });
       } 
    
       // if the code reaches here - the user was found
       // therefore the session is valid
       // therefore the refresh token exists in the database but we still have to check if it has expired
      
        req.user_id = user._id;
        req.userObject = user;
         req.refreshToken = refreshToken;
        //  user.sessions = user.sessions.filter((session)=>{
        //      return session.token !== refreshToken;
        //  })
        let  isSessionValid =  false;


        user.sessions.forEach((session)=>{
             if(session.token === refreshToken){
                 // check if the session has expired

                  
                 if(User.hasRefreshTokenExpired(session.expiresAt) === false){
                     
                    //  refresh token has not expired
                       isSessionValid = true;

                 }

             }
        });

        if(isSessionValid){
            // if session is valid call the next() to continue with processiong the web request
             next();
        }else{
            // the session is not valid
            return Promise.reject({
                'error':'Refresh token has expired or the session is invalid'
            })
        }


    }).catch((e)=>{
          res.status(401).send(e)
    })


}

app.get('/lists',authenticate,(req,res) =>{
//    res.send("Hello World");
// we want to retuen an array of all the lists in the database
List.find({
    _userId:req.user_id
}).then((lists)=>{
    res.send(lists)
}).catch((e)=>{
    res.send(e);
})
}
)




app.post('/lists',authenticate,(req,res)=>{
    // we wnat to create a new list and return the new list document back to user  which include id
    // list info fields will  be passed in via the JSON request body
       

    let title = req.body.title;

    let newList = new List({
        title,
        _userId:req.user_id
        
    });
    newList.save().then((listDoc)=>{
        res.send(listDoc)
    })
     


})

app.patch('/lists/:id',authenticate,(req,res)=>{
    // we wnat to update the specified list (list document witn id in the URL ) with the
    // new values specified in the json body of the request

    List.findOneAndUpdate({_id:req.params.id, _userId:req.user_id},{$set:req.body}).then(()=>{
        res.send({message:'Updated Succesfully'})
    })
})

app.delete('/lists/:id',authenticate,(req,res)=>{
    
    List.findOneAndDelete({_id:req.params.id, _userId:req.user_id}).then((removeListDoc)=>{
        res.send(removeListDoc)

        deleteTaskFromList(removeListDoc._id);
    })
})

// if we wnat to rmove all task that belong to a specific list
app.get('/lists/:listId/tasks',authenticate,(req,res)=>{
    Task.find({
        _listId:req.params.listId
    }).then((tasks)=>{
        res.send(tasks)
    })

})

app.post('/lists/:listId/tasks',authenticate,(req,res)=>{
    // to create a new task in a  list specified by listId

    List.findOne({
        _id:req.params.listId,
        _userId:req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid 
            // therefore the currently authenticated user can create new task
            return true;
        }

        return false;
    }).then((canCreateTask)=>{
        if(canCreateTask){
            let newTask = new Task({
                title:req.body.title,
                _listId:req.params.listId
           })
            newTask.save().then((newTaskDoc)=>{
               res.send(newTaskDoc)
            })
       }else{
           res.sendStatus(404);
       }
        }
    )
})

   

app.patch('/lists/:listId/tasks/:taskId',authenticate,(req,res)=>{
    // updatate specific task specified n=by taskid

    List.findOne({
        _id:req.params.listId,
        _userId:req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid 
            // therefore the currently authenticated user can create new task
            return true;
        }

        return false;
    }).then((canUpdateTasks)=>{
        if(canUpdateTasks){
            return Task.findOneAndUpdate({
                _id:req.params.taskId,
                _listId:req.params.listId
            },{
                $set:req.body
            }).then(()=>{
                res.send({message:'Updated Succesfully'});
            })
        }else{
            res.sendStatus(404);
        }
    })

})
    

//     Task.findOneAndUpdate({
//        _id: req.params.taskId,
//        _listId:req.params.listId

//     },{
//         $set:req.body
//     }).then(()=>{
//         res.sendStatus({message:'Updated Succesfully'});
//     })
// })

app.delete('/lists/:listId/tasks/:taskId',authenticate,(req,res)=>{
   
    List.findOne({
        _id:req.params.listId,
        _userId:req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid 
            // therefore the currently authenticated user can create new task
            return true;
        }

        return false;
    }).then((canDeleteTasks)=>{
        if(canDeleteTasks){
            return Task.findOneAndDelete({
                _id:req.params.taskId,
               _listId:req.params.listId
            }).then((removeTaskDoc)=>{
                res.send(removeTaskDoc)
            })
        }else{
            res.sendStatus(404);
        }
    })
      
    })
   
   
   
 

app.get('/lists/:listId/tasks/:taskId',(req,res)=>{
  
      List.findOne({
        _id:req.params.listId,
        _userId:req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid 
            // therefore the currently authenticated user can create new task
            return true;
        }

        return false;
    }).then((canUpdateTasks)=>{
        if(canUpdateTasks){
            return Task.findOneAndUpdate({
                _id:req.params.taskId,
                _listId:req.params.listId
            },{
                $set:req.body
            }).then(()=>{
                res.send({message:'Updated Succesfully'});
            })
        }else{
            res.sendStatus(404);
        }
    })
  
  
    Task.findOne({
        _id:req.params.taskId,
        _listId:req.params.listId

    }).then((task)=>{
        res.send(task)
    })
});


// user route

// 

app.post('/users',(req,res)=>{  
   
     //user signup
     let body = req.body;
     let newUser = new User(body);

     newUser.save().then(()=>{
      return newUser.createSession();


     }).then((refreshToken)=>{
        return newUser.generateAccessAuthToken().then((accessToken)=>{
            return {accessToken,refreshToken};
        })
     }).then((authTokens)=>{
             
           res.header('x-refresh-token',authTokens.refreshToken);
           res.header('x-access-token',authTokens.accessToken);
           res.send(authTokens)

     }).catch((e)=>{
         res.status(400).send(e);
     })



})

app.post('/users/login',async (req,res)=>{
    try {
        let email = req.body.email;
        let password = req.body.password;
       const user=await User.findOne({email})
       if(!user){
        return res.status(404).send({
            status:400,
            message:"User not found"
        })
       }
       const token=await user.generateAccessAuthToken();
       console.log(token)       
       res.header('x-access-token', token).send({
        user,
        token
       });
        
    } catch (error) {
        res.status(500).send(error);
    }  
})





app.get('/users/me/access-token', verifySession,(req,res)=>{
    
    // we know that the user/called is authenticated and we have the userid and userObject  available to us
   req.userObject.generateAccessAuthToken().then((accessToken)=>{
       res.header('x-access-token',accessToken);
       res.send({accessToken});
   }).catch((e)=>{
     res.status(400).send(e);
   })


})

// app.get('/lists/:listId/task',(req,res)=>{
//     Task.find({

//     })
// })

let deleteTaskFromList = (_listId)=>{
    Task.deleteMany({
        _listId
    }).then(()=>{
        console.log("Tasks from " + _listId + " were deleted")
    })
}














app.listen(8000,()=>{
    console.log(`Server is listening on port 8000`);
})