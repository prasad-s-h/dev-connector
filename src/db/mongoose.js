const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const uri = process.env.MONGODB_URI;
const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
};

mongoose
  .connect(uri, options)
  .then(() => {
    console.log(`successfully connected to database`);
  })
  .catch(err => {
    console.log(`failed to connect to database server`);
    console.log(`${err}`);
  });
