const express = require('express');
const { check, validationResult, body } = require('express-validator/check');
const User = require('../../models/User');
const gravatar = require('gravatar');

const router = express.Router();

// @route   POST /api/users
// @desc    create a user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      // Get Users gravatar
      const avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });

      const userDoc = new User({
        name,
        email,
        password,
        avatar
      });

      // Encrypt password:- achieved using pre hook middleware

      /* Create and Return jsonwebtoken:- achieved using generateAuthToken() on an instance 
      [ref line no 60 and 61]*/

      // happy path
      const newUser = await userDoc.save();
      const token = await newUser.generateAuthToken();
      res.send({ token });
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

module.exports = router;
