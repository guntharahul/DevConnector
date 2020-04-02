const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');

// @route   POST api/users
// @desc    Register user
// @access  public
router.post(
  '/',
  [
    check('name', 'Name is Required') // check if entered data is valid or not
      .not()
      .isEmpty(),
    check('email', 'Please include a valid emial').isEmail(),
    check('password', 'Please enter a password of length 6 or more').isLength({
      min: 6
    })
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      }); //Bad Request
    }

    const { name, email, password } = req.body;

    try {
      //see if user exists with the same email

      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      //get users gravator

      const avatar = gravatar.url(email, {
        s: '200',
        r: 'pg',
        d: 'mm'
      });

      user = new User({
        name,
        email,
        avatar,
        password
      });

      //encrypt password

      const salt = await bcrypt.genSalt(10); //10 rounds of encryption

      user.password = await bcrypt.hash(password, salt); //creating a hash for the password

      //saving user to database
      await user.save();

      //return JSON webtoken.

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 36000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Internal Server Error');
    }
  }
);

module.exports = router;
