const express = require('express');
const router = express.Router();
const appointmentController = require('../Controller/appointmentController');
const { protect } = require("../Controller/authController");

router.post('/recherche', appointmentController.recherche);
router.post('/reservations', appointmentController.reservations);
router.get('/getAllReservations/',protect(["admin"]), appointmentController.getAll);
router.get('/calendar/:professionalId', appointmentController.getAppointmentsForCalendar);
router.get('/calendarClient/:clientId', appointmentController.getAppointmentsCalendarForClient);
router.get('/getClient/:id', appointmentController.getAllClientForProf);

router.get('/confirm/:id', appointmentController.confirm);
router.get('/cancelled/:id', appointmentController.cancelled);


module.exports = router;