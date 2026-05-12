const bcrypt = require("bcrypt");

const saltRounds = 10;

module.exports.comparePassword = (req, res, next) => {
  bcrypt.compare(req.body.password, res.locals.hash, (err, isMatch) => {
    if (err) {
      console.error("Error bcrypt:", err);
      return res.status(500).json(err);
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    return next();
  });
};

module.exports.hashPassword = (req, res, next) => {
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) {
      console.error("Error bcrypt:", err);
      return res.status(500).json(err);
    }

    res.locals.hash = hash;
    return next();
  });
};
