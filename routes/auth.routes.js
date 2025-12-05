const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// registro simple
router.post("/register", async (req, res) => {
  try {
    const { email, password, role, fullName, phoneNumber, policeRank } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password muy corta" });
    }

    const user = new User({ email, role, fullName, phoneNumber, policeRank });
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ user: { ...user.toObject(), passwordHash: undefined }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ user: { ...user.toObject(), passwordHash: undefined }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
