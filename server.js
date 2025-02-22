const express = require('express');
const app = express();
const connectDB = require('./config/db');
const path=require('path');

//connect DB
connectDB();

//Init middleware
app.use(express.json({ extended: false }));

// app.get('/', (req, res) => {
//   res.send('API is running');
// });

app.use('/api/users', require('./routes/api/users'));
app.use('/api/posts', require('./routes/api/posts'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/auth', require('./routes/api/auth'));


//setup for production
//server static assets in production
if(process.env.NODE_ENV==='production'){
  //set static folder
  app.use(express.static('client/build'));

  app.get('*',(req,res)=>{
    require.send(path.resolve(__dirname,'client','build','index.html'))
  })
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
