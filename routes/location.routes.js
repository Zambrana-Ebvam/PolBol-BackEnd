const router = require("express").Router();
const Location = require("../models/Location");
const auth = require("../middlewares/authMiddleware");

// civil u oficial manda su ubicación actual
router.put("/me", auth, async (req, res) => {
  try {
    const { lon, lat, accuracyM, headingDeg, speedMps } = req.body;
    if (lon == null || lat == null) {
      return res.status(400).json({ error: "lon/lat requeridos" });
    }

    const update = {
      userId: req.user._id,
      coords: { type: "Point", coordinates: [lon, lat] },
      accuracyM,
      headingDeg,
      speedMps,
      updatedAt: new Date(),
    };

    const loc = await Location.findOneAndUpdate(
      { userId: req.user._id },
      update,
      { upsert: true, new: true }
    );

    res.json(loc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
