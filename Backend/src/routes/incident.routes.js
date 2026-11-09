const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', incidentController.getIncidents);
router.post('/', incidentController.createIncident);
router.put('/:id', authorizeRoles('admin', 'bakery'), incidentController.updateIncident);
router.delete('/:id', authorizeRoles('admin', 'bakery'), incidentController.deleteIncident);

module.exports = router;