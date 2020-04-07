const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

//@route POST api/posts
// @desc Adding a post
// access private, user can post when he is logged in.

router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
  }
);

//@route GET api/posts
// @desc get all posts
// access private.

router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
});

//@route GET api/posts/:id
// @desc get post by Id
// access private.

router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.json(post);
    if (!post) {
      return res.status(404).json({ msg: 'Post Not found' });
    }
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      //to check if the params id is valid or not
      return res.status(404).json({ msg: 'Post Not found' });
    }
    res.status(500).send('Internal Server Error');
  }
});

//@route Delete api/posts/:id
// @desc delete a post
// access private.

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json('Post Not found');
    }

    //check on the user if the post belos to him.
    if (post.user.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: 'User not authorized to delete the post' });
    }
    await post.remove();
    res.json({ msg: 'post removed' });
    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      //to check if the params id is valid or not
      return res.status(404).json({ msg: 'Post Not found' });
      res.status(500).send('Internal Server Error');
    }
  }
});

//@route PUT api/posts/like/:id
// @desc like a post
// access private.
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if this user already liked the post.
    if (
      post.likes.filter((like) => like.user.toString() == req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: 'Post already liked.' });
    }
    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
});

//@route PUT api/posts/unlike/:id
// @desc unlike a post, a user who liked the post can unlike it.
// access private.
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    //check if this user has not liked the post.
    if (
      post.likes.filter((like) => like.user.toString() == req.user.id)
        .length === 0
    ) {
      return res.status(400).json({ msg: 'Post has not yet been liked.' });
    }

    const removeIndex = post.likes.map((like) =>
      like.user.toString().indexOf(req.user.id)
    ); // get the index of the user to remove from the liked array

    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
});

//@route POST api/posts/comments/:id
// @desc Adding comments to a post
// access private, user can add comments to a post only when he is logged in.

router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);
      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };
      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
    }
  }
);

//@route DELETE api/posts/comments/:id/:comment_id    post_id and comment_id
//@desc delete comments of a post
//access private, user can delete comments to a post only when he is logged in.
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    //get the comments of the post
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );
    if (!comment) {
      //check if the comment exists
      return res.status(404).json({ msg: 'Comment does not exist' });
    }
    if (comment.user.toString() !== req.user.id) {
      //check if the loggedIn user added the comment as others can not delete his comment.
      return res
        .status(401)
        .json({ msg: 'User not authorized to delete his own comment.' });
    }
    const removeIndex = post.comments.map((comment) =>
      comment.user.toString().indexOf(req.user.id)
    ); // get the index of the user to remove from the liked array

    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
