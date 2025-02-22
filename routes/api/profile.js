const express = require('express');
const router = express.Router();
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const request = require('request');
const config = require('config');
const Post = require('../../models/Post');
const { check, validationResult } = require('express-validator');

//@route GET api/profile/me
// @desc get current user profile.
// private route
router.get('/me', auth, async (req, res) => {
  try {
    var profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['email', 'avatar']
    );
    //populate will add the data which is not in profile model, here we are adding from user model.
    if (!profile) {
      res.status(400).json({
        message: 'There is no profile for this user',
      });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route POST api/profile
// @desc create or update user profile
// private route
router.post(
  '/',
  [
    auth,
    [
      check('status', 'Status is required').not().isEmpty(),
      check('skills', 'Skills is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body;

    //
    //
    //
    //
    //
    //
    //Build profile object to save to database.
    // const profileFields = {};
    // profileFields.user = req.user.id;
    // if (company) profileFields.company = company;
    // if (website) profileFields.website = website;
    // if (location) profileFields.location = location;
    // if (bio) profileFields.bio = bio;
    // if (status) profileFields.status = status;
    // if (githubusername) profileFields.githubusername = githubusername;
    // if (skills) {
    //   profileFields.skills = skills.split(',').map((skill) => skill.trim());
    // } // this is an array

    // //Build social object
    // profileFields.social = {};
    // if (youtube) profileFields.social.youtube = youtube;
    // if (facebook) profileFields.social.facebook = facebook;
    // if (twitter) profileFields.social.twitter = twitter;
    // if (linkedin) profileFields.linkedin = linkedin;
    // if (instagram) profileFields.social.instagram = instagram;

    // try {
    //   let profile = await Profile.findOne({ user: req.user.id });
    //   if (profile) {
    //     //Update the existing profile
    //     profile = await Profile.findOneAndUpdate(
    //       { user: user.req.id },
    //       { $set: profileFields },
    //       { new: true }
    //     );
    //     return res.json(profile);
    //   }
    //   // if no profile exists then create one and save it to DB.
    //   profile = new Profile(profileFields);
    //   await profile.save();
    //   console.log(profile);
    //   res.json(profile);
    //
    //
    //
    //
    //

    const profileFields = {
      user: req.user.id,
      company,
      location,
      website: website === '' ? '' : normalize(website, { forceHttps: true }),
      bio,
      skills: Array.isArray(skills)
        ? skills
        : skills.split(',').map((skill) => ' ' + skill.trim()),
      status,
      githubusername,
    };

    // Build social object and add to profileFields
    const socialfields = { youtube, twitter, instagram, linkedin, facebook };

    for (const [key, value] of Object.entries(socialfields)) {
      if (value.length > 0)
        socialfields[key] = normalize(value, { forceHttps: true });
    }
    profileFields.social = socialfields;

    try {
      // Using upsert option (creates new doc if no match is found):
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true }
      );
      res.json(profile);

      //
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route GET api/profile
// @desc   get all the profile information.
//@access public

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route GET api/profile/user/:used_id
// @desc   get profile of a particular user by user_id.
//@access public

router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);
    if (!profile)
      return res.status(400).json({
        msg: 'Profile not found.',
      });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    // to check if the id in the params is wrong
    if (err.kind == 'ObjectId') {
      return res.status(400).json({
        msg: 'Profile not found.',
      });
    }
    res.status(500).send('Server Error');
  }
});

// @route Delete api/profile
// @desc   delete profile , user and posts
//@access private
router.delete('/', auth, async (req, res) => {
  try {
    //  remove user posts when the account is deleted
    //here the user is deleted based on the token of the user who is logged in.

    //Remove User Posts
    await Post.deleteMany({ user: req.user.id });

    //Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });

    //Remove user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User Deleted.' });
  } catch (err) {
    console.error(err.message);
  }
});

// @route PUT api/profile/experince
// @desc   Add profile experince
//@access private

router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),

      check('company', 'Company is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;
    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.experience.unshift(newExp); //unshift function keeps the object on the top
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Error');
    }
  }
);

// @route Delete api/profile/experince/exp_id
// @desc  Delete profile experince
//@access private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id);
    profile.experience.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ msg: 'Internal Server Error' });
  }
});

// @route PUT api/profile/education
// @desc   Add profile education
//@access private

router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School is required').not().isEmpty(),

      check('degree', 'Degree is required').not().isEmpty(),
      check('fieldofstudy', 'fieldofstudy is required').not().isEmpty(),
      check('from', 'From is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;
    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.education.unshift(newEdu); //unshift function keeps the object on the top
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Error');
    }
  }
);

// @route Delete api/profile/education/edu_id
// @desc  Delete profile education
//@access private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    // Get remove index
    const removeIndex = profile.education
      .map((item) => item.id)
      .indexOf(req.params.edu_id);
    profile.education.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ msg: 'Internal Server Error' });
  }
});

// @route GET api/profile/github/:username
// @desc  Get user repos from github
//@access public

router.get('/github/:username', async (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        'githubClientId'
      )}&client_secret=${config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' },
    };
    request(options, (error, response, body) => {
      if (error) console.error(error);
      if (response.statusCode != 200) {
        return res.status(404).json({ msg: 'No github profile found' });
      }
      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
