const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.get('/trips', tripController.getTrips);
router.post('/trips', tripController.addTrip);
router.put('/trips/:id', tripController.updateTrip);
router.delete('/trips/:id', tripController.deleteTrip);

module.exports = router;