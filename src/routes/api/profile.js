const express = require('express');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const { check, validationResult } = require('express-validator/check');
const request = require('request');

const router = express.Router();

// @route   POST /api/profile
// @desc    create/update user's profile
// @access  private/protected
router.post(
  '/',
  [
    auth,
    [
      check('status', 'Status is Required')
        .not()
        .isEmpty(),
      check('skills', 'Skills is Required')
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }
    const {
      company,
      website,
      location,
      status,
      skills,
      bio,
      githubusername,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;

    // Build profile object
    const profileFields = {};
    profileFields.user = req.user._id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (status) profileFields.status = status;
    if (skills) {
      profileFields.skills = skills.split(',').map(skill => skill.trim());
    }
    if (bio) profileFields.bio = bio;
    if (githubusername) profileFields.githubusername = githubusername;

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (facebook) profileFields.social.facebook = facebook;
    if (twitter) profileFields.social.twitter = twitter;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;

    try {
      // update profile
      const profile = await Profile.findOne({ user: req.user._id });
      if (profile) {
        const updatedProfile = await Profile.findOneAndUpdate(
          { user: req.user._id },
          { $set: profileFields },
          { new: true }
        );
        return res.send({ updatedProfile });
      }

      // create profile
      const profileDoc = new Profile(profileFields);
      const newProfile = await profileDoc.save();
      res.send({ newProfile });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/profile/me
// @desc    user's profile
// @access  private/protected
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id }).populate(
      'user',
      ['name', 'avatar']
    );
    if (!profile) {
      return res.status(404).send({ msg: 'There is no profile for this user' });
    }
    res.json(profile);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/profile
// @desc    get all users profiles
// @access  public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.send(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/profile/user/:user_id
// @desc    get user's profile based on user_id
// @access  public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate('user', ['name', 'avatar']);
    if (!profile) {
      return res.status(404).send('Profile not found');
    }
    res.send(profile);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).send('Profile not found');
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/profile
// @desc    delete user's profile,user's posts, user from system
// @access  private/protected
router.delete('/', auth, async (req, res) => {
  try {
    /*
        refer this only for making changes if u need in the future:-
        1. if user deletes his own profile, let him/her delete the user profile, keep the user posts as it is.
        2. if user deletes his/her own account, this inturn should delete user's profile and posts also to save up the space
        */
    // remove user's profile
    await Profile.findOneAndDelete({ user: req.user._id });
    // remove user's posts
    // remove user from system
    await User.findOneAndDelete({ _id: req.user._id });
    res.send({ msg: 'User Deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/profile/experience
// @desc    update user's experience under profile
// @access  private/protected
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is Required')
        .not()
        .isEmpty(),
      check('company', 'Company is Required')
        .not()
        .isEmpty(),
      check('from', 'From Date is Required')
        .not()
        .isEmpty()
    ]
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
      description
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    };

    try {
      const profile = await Profile.findOne({ user: req.user._id });
      profile.experience.unshift(newExp);
      await profile.save();
      res.send(profile);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE /api/profile/experience/:exp_id
// @desc    delete user's experience under profile
// @access  private/protected
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user._id });
    profile.experience = profile.experience.filter(
      exp => exp._id.toString() !== req.params.exp_id
    );
    await profile.save();
    res.send(profile);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/profile/education
// @desc    update user's education under profile
// @access  private/protected
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School Info is Required')
        .not()
        .isEmpty(),
      check('degree', 'Degree Info is Required')
        .not()
        .isEmpty(),
      check('fieldofstudy', 'FieldOfStudy Info is Required')
        .not()
        .isEmpty(),
      check('from', 'From Date is Required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }
    try {
      const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
      } = req.body;
      const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
      };
      const profile = await Profile.findOne({ user: req.user._id });
      profile.education.unshift(newEdu);
      await profile.save();
      res.send(profile);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE /api/profile/education/:edu_id
// @desc    delete user's education under profile
// @access  private/protected
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    let profile = await Profile.findOne({ user: req.user._id });
    profile.education = profile.education.filter(
      education => education._id.toString() !== req.params.edu_id
    );
    await profile.save();
    res.send(profile);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/profile/:username for ex: GET /users/:username/repos
// @desc    get user's public repositories
// @access  public
router.get('/github/users/:username', (req, res) => {
  try {
    const options = {
      url: `https://api.github.com/users/${req.params.username}/repos`,
      headers: {
        'User-Agent': 'dev-connector' // Your Github ID or application name
      }
    };
    request(options, function(error, response, body) {
      if (error) throw new Error(error); // Print the error if one occurred
      // Print the response status code if a response was received
      if (response.statusCode !== 200) {
        return res.status(404).send('GitHub Profile Not Found');
      }
      const result = JSON.parse(body);
      const userRepo = result.map(repo => repo.name);
      res.send({ userRepo });
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
