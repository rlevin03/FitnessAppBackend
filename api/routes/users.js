const express = require('express');
const { default: mongoose } = require('mongoose');
const cron = require('node-cron');
const ClassModel = require('../models/Class');
const UserModel = require('../models/User');

const router = express.Router();

router.get('/signees', async (req, res) => {
  const { classId } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }

    const classData = await ClassModel.findById(classId).populate(
      'usersSignedUp',
      'name email totalReservations _id'
    );

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const users = classData.usersSignedUp;
    res.json(users);
  } catch (err) {
    console.error('Error fetching class data:', err.message);
    res.status(500).json({ message: 'Error fetching class data' });
  }
});

router.get('/classesAttended', async (req, res) => {
  const { userId } = req.query;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    const userData = await UserModel.findById(userId);

    const classes = userData.classesAttended;
    res.json(classes);
  } catch (err) {
    console.error('Error fetching user data:', err.message);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

cron.schedule('0 0 1 * *', async () => {
  try {
    await UserModel.updateMany({}, { $set: { classesAttended: 0 } });
    console.log('Classes attended reset');
  } catch (error) {
    console.error(error);
  }
});

router.get('/totalReservations', async (req, res) => {
  const { userId } = req.query;

  try {
    // Validate the user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Fetch the user data by ID
    const userData = await UserModel.findById(userId);

    // Check if the user data exists
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure `classesAttended` is an array
    const classes = Array.isArray(userData.totalReservations)
      ? userData.totalReservations
      : [];

    // Respond with the `classesAttended` array
    res.json(classes);
  } catch (err) {
    console.error('Error fetching user data:', err.message);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

router.post('/update-campus', async (req, res) => {
  const { email, location } = req.body;
  try {
    await UserModel.updateOne({ email }, { $set: { location } });
    res.status(200).send({ message: 'Campus updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to update campus' });
  }
});

router.get('/instructors', async (req, res) => {
  try {
    const instructors = await UserModel.find(
      { isInstructor: true },
      '_id name'
    );
    res.json(instructors);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to fetch instructors' });
  }
});

module.exports = router;
