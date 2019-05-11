const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 6
  },
  avatar: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre('save', function(next) {
  let userDoc = this;
  if (userDoc.isModified('password')) {
    bcrypt
      .genSalt(11)
      .then(salt => {
        return bcrypt.hash(userDoc.password, salt);
      })
      .then(hash => {
        userDoc.password = hash;
        next();
      })
      .catch(err => {
        console.log('error = ', err);
      });
  } else {
    next();
  }
});

UserSchema.methods.generateAuthToken = async function() {
  const user = this;
  const token = jwt.sign(
    { user: { _id: user._id.toString() } },
    process.env.JWT_SECRET_KEY
  );
  return token;
};

UserSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid Credentials');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid Credentials');
  }
  return user;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
