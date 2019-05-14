const express = require('express');
const { check, validationResult } = require('express-validator/check');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const Post = require('../../models/Post');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create user Post
// @access  private/protected
router.post(
  '/',
  [
    auth,
    [
      check('text', 'text field cannot be empty')
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
      const user = await User.findById(req.user._id);
      const newPostDoc = new Post({
        user: req.user._id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar
      });
      const newPost = await newPostDoc.save();
      res.send(newPost);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/posts
// @desc    get all users Posts
// @access  private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    if (!posts) {
      return res.status(404).send({ msg: 'No Posts found' });
    }
    res.send(posts);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/posts/:id
// @desc    get Post by id
// @access  private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send({ msg: 'No Post found' });
    }
    res.send(post);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).send({ msg: 'No Post found' });
    }
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/posts/:id
// @desc    delete Post by id
// @access  private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).send({ msg: 'No Post found' });
    }
    if (post.user.toString() !== req.user._id) {
      return res.status(401).send({ msg: 'User not Authorized' });
    }
    await post.remove();
    res.send({ msg: 'Post removed' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).send({ msg: 'No Post found' });
    }
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/posts/like/:id
// @desc    like a user's post by id
// @access  private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (
      post.likes.filter(like => like.user.toString() === req.user._id).length >
      0
    ) {
      return res.status(400).send({ msg: 'Post already liked' });
    }
    post.likes.unshift({ user: req.user._id });
    await post.save();
    res.send(post.likes);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/posts/unlike/:id
// @desc    unlike a user's post by id
// @access  private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (
      post.likes.filter(like => like.user.toString() === req.user._id)
        .length === 0
    ) {
      return res.status(400).send({ msg: 'Post has not been liked' });
    }
    post.likes = post.likes.filter(
      like => like.user.toString() !== req.user._id
    );
    await post.save();
    res.send(post.likes);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/posts/comment/:id
// @desc    comment on a user's post by id
// @access  private
router.post(
  '/comment/:id',
  [
    auth,
    [
      check('text', 'text is required')
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
      const user = await User.findById(req.user._id);
      const post = await Post.findById(req.params.id);
      const comment = {
        user: req.user._id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar
      };
      post.comments.unshift(comment);
      await post.save();
      res.send(post.comments);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE /api/posts/comment/:post_id/:comment_id
// @desc    remove a user's comment from a user's post by post_id and comment_id
// @access  private
router.delete('/comment/:post_id/:comment_id', auth, async (req, res) => {
  try {
    // pull out the post from the posts collection based on post_id
    const post = await Post.findById(req.params.post_id);
    // pull out the comment from the post based on comment_id
    const comment = post.comments.find(
      comment => comment._id.toString() === req.params.comment_id
    );
    //check if comment exists
    if (!comment) {
      return res.status(404).send({ msg: 'Comment not Found' });
    }
    // only the owner of the comment should be able to delete his/her own comment
    if (comment.user.toString() !== req.user._id) {
      return res.status(401).send({ msg: 'User not Authorized' });
    }
    await comment.remove();
    await post.save();
    res.send(post.comments);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
