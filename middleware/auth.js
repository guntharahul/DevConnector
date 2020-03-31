const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function(req, res, next) {
  //get the token from the header when a request is sent to backend
  const token = req.header('x-auth-token');

  // if there is no token
  if (!token) {
    return res.status(401).json({
      message: 'No token, authorization denied'
    });
  }

  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded.user; // decoding the user
    next();
  } catch (err) {
    //if the token is not valid
    res.status(401).json({
      message: 'Token is not vallid'
    });
  }
};
