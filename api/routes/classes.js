const express = require("express");
const ClassModel = require("../models/Class");
const UserModel = require("../models/User");
const { default: mongoose } = require("mongoose");

const router = express.Router();

router.get("/byDate", async (req, res) => {
  try {
    const classes = await ClassModel.find().sort({ date: 1 });
    res.json(classes);
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.status(500).json({ message: "Error fetching classes" });
  }
});

router.get("/filtered", async (req, res) => {
  const { date, types, campuses, instructors } = req.query;

  let query = {};

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query.date = { $gte: startOfDay, $lte: endOfDay };
  }

  if (types) {
    query.type = { $in: types.split(",") };
  }

  if (campuses) {
    query.campus = { $in: campuses.split(",") };
  }

  if (instructors) {
    query.instructor = { $in: instructors.split(",") };
  }

  try {
    const classes = await ClassModel.find(query);
    res.json(classes);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/reservations", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("Missing userId");
  }

  try {
    const user = await UserModel.findById(userId)
      .populate("reservations")
      .populate("waitLists");

    if (!user) {
      return res.status(404).send("User not found");
    }

    const classes = {
      reservations: user.reservations.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ),
      waitLists: user.waitLists.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ),
    };

    res.status(200).json(classes);
  } catch (err) {
    console.error("Error fetching user reservations:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/instructor", async (req, res) => {
  const { instructorId } = req.query;

  if (!instructorId) {
    return res.status(400).json({ message: "Missing instructorId" });
  }

  try {
    const instructor = await UserModel.findById(instructorId);
    res.status(200).json(instructor.name);
  } catch (err) {
    console.error("Error fetching instructor:", err);
    res.status(500).json({ message: err.message });
  }
});

router.patch("/reserve", async (req, res) => {
  const { userId, classId } = req.body;

  // Validate input
  if (!userId || !classId) {
    return res.status(400).json({ message: "Missing userId or classId" });
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(classId)
  ) {
    return res.status(400).json({ message: "Invalid userId or classId" });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch user and class documents
    const user = await UserModel.findById(userId).session(session);
    const cls = await ClassModel.findById(classId).session(session);

    // Validate existence
    if (!user) throw new Error("User not found");
    if (!cls) throw new Error("Class not found");

    // Check if the user is already signed up or waitlisted
    if (
      cls.usersSignedUp.includes(userId) ||
      cls.usersOnWaitList.includes(userId)
    ) {
      throw new Error("User is already registered for this class");
    }

    // Add user to the class or waitlist
    if (cls.usersSignedUp.length < cls.maxCapacity) {
      user.reservations.push(classId);
      cls.usersSignedUp.push(userId);
      cls.totalSignUps.push(userId);
    } else if (cls.usersOnWaitList.length < cls.waitListCapacity) {
      user.waitLists.push(classId);
      cls.usersOnWaitList.push(userId);
    } else {
      throw new Error("Class and waitlist are full");
    }

    // Save changes to both documents
    await cls.save({ session });
    await user.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    res.status(200).json({ message: "Reservation successful", classData: cls });
  } catch (err) {
    console.error("Error reserving class:", err);
    await session.abortTransaction();
    res
      .status(
        err.message === "Class and waitlist are full"
          ? 400
          : err.message.includes("found")
          ? 404
          : 500
      )
      .json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.patch("/cancel", async (req, res) => {
  const { userId, classId } = req.body;

  if (!userId || !classId) {
    return res.status(400).json({ message: "Missing userId or classId" });
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(classId)
  ) {
    return res.status(400).json({ message: "Invalid userId or classId" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await UserModel.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: "User not found" });
    }

    const cls = await ClassModel.findById(classId).session(session);
    if (!cls) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Class not found" });
    }

    const userIndex = cls.usersSignedUp.indexOf(userId);
    if (userIndex !== -1) {
      cls.usersSignedUp.splice(userIndex, 1);
      cls.totalSignUps.splice(userIndex, 1);

      const reservationIndex = user.reservations.indexOf(classId);
      if (reservationIndex !== -1) {
        user.reservations.splice(reservationIndex, 1);
      }

      // Check if there is anyone on the waitlist
      if (cls.usersOnWaitList.length > 0) {
        const nextUserId = cls.usersOnWaitList.shift();

        cls.usersSignedUp.push(nextUserId);
        cls.totalSignUps.push(nextUserId);

        // Update the next user’s reservations
        const nextUser = await UserModel.findById(nextUserId).session(session);
        if (nextUser) {
          nextUser.reservations.push(classId);
          const userWaitListIndex = nextUser.waitLists.indexOf(classId);
          if (userWaitListIndex !== -1) {
            nextUser.waitLists.splice(userWaitListIndex, 1);
          }
          await nextUser.save({ session });
        }
      }
    } else {
      const waitListIndex = cls.usersOnWaitList.indexOf(userId);
      if (waitListIndex !== -1) {
        cls.usersOnWaitList.splice(waitListIndex, 1);

        const userWaitListIndex = user.waitLists.indexOf(classId);
        if (userWaitListIndex !== -1) {
          user.waitLists.splice(userWaitListIndex, 1);
        }
      } else {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "User is not registered for this class" });
      }
    }

    await cls.save({ session });
    await user.save({ session });

    await session.commitTransaction();
    res
      .status(200)
      .json({ message: "Cancellation successful", classData: cls });
  } catch (err) {
    console.error(
      `Error cancelling class for userId ${userId} and classId ${classId}:`,
      err
    );
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

router.post("/attendance", async (req, res) => {
  const { present, absent, classId } = req.body;

  // Input validation
  if (!present || !absent || !classId) {
    return res
      .status(400)
      .json({ message: "Missing present, absent, or classId" });
  }

  if (
    !mongoose.Types.ObjectId.isValid(classId) ||
    !present.every((id) => mongoose.Types.ObjectId.isValid(id)) ||
    !absent.every((id) => mongoose.Types.ObjectId.isValid(id))
  ) {
    return res
      .status(400)
      .json({ message: "Invalid present, absent, or classId" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch the class data
    const classData = await ClassModel.findById(classId).session(session);

    if (!classData) {
      throw new Error("Class not found");
    }

    const allUsers = classData.usersSignedUp.concat(classData.usersOnWaitList);

    // Update present users
    await UserModel.updateMany(
      { _id: { $in: present } },
      {
        $inc: { classesAttended: 1 },
        $addToSet: { totalReservations: classId },
        $pull: { reservations: classId, waitLists: classId },
      },
      { session }
    );

    // Update absent users
    await UserModel.updateMany(
      { _id: { $in: absent } },
      {
        $inc: { absenceCount: 1 },
        $pull: { reservations: classId, waitLists: classId },
      },
      { session }
    );

    // Remove classId from reservations and waitLists for all users
    await UserModel.updateMany(
      { _id: { $in: allUsers } },
      {
        $pull: { reservations: classId, waitLists: classId },
      },
      { session }
    );

    // Mark attendance as taken for the class
    const updatedClass = await ClassModel.findByIdAndUpdate(
      classId,
      { $set: { attendanceTaken: true } },
      { new: true, session }
    );

    await session.commitTransaction();
    res.status(200).json({
      message: "Attendance submitted successfully.",
      classData: updatedClass,
    });
  } catch (err) {
    console.error("Error submitting attendance:", err);
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
