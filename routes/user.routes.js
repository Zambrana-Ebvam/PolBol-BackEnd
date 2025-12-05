const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");

router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
