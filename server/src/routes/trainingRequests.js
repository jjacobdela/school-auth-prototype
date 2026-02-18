const express = require("express");
const router = express.Router();
const TrainingRequest = require("../models/TrainingRequest");
const Module = require("../models/Module");
const { requireAuth } = require("../middleware/auth");


// Request training
router.post("/", requireAuth, async (req, res) => {
  const moduleExists = await Module.findById(req.body.moduleId);
  if (!moduleExists) {
    return res.status(404).json({ message: "Module not found" });
  }
  
  const request = await TrainingRequest.create({
    module: req.body.moduleId,
    requestedBy: req.user.userId,
    justification: req.body.justification
  });
  

  res.status(201).json(request);
});

// Admin view
router.get("/", requireAuth, async (req, res) => {
  const requests = await TrainingRequest.find()
    .populate("module")
    .populate("requestedBy", "name")
    .populate("reviewedBy", "name");

  res.json(requests);
});

// Approve / Reject
router.put("/:id", requireAuth, async (req, res) => {
  const request = await TrainingRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status,
      reviewedBy: req.user.userId
    },
    { new: true }
  );

  res.json(request);
});

module.exports = router;
