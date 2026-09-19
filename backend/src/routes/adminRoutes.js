const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const {
  getRoster,
  approveStudentCredentials,
  getTelemetry,
  dossierLookup
} = require('../controllers/adminController');
const institution = require('../controllers/institutionController');
const universityAdmin = require('../controllers/universityAdminController');
const governmentAdmin = require('../controllers/governmentAdminController');

const router = express.Router();

router.use(protect, restrictTo('admin', 'university_admin', 'government_admin'));

// Common admin routes
router.get('/roster', getRoster);
router.post('/roster/:id/approve', approveStudentCredentials);
router.get('/telemetry', getTelemetry);
router.get('/dossier-lookup/:skillSetuId', dossierLookup);
router.get('/overview', institution.getOverview);
router.get('/candidates', institution.listCandidates);
router.post('/drives', institution.createDrive);
router.patch('/drives/:id', institution.updateDrive);
router.delete('/drives/:id', institution.deleteDrive);
router.patch('/applications/:id', institution.updateApplication);
router.put('/placements', institution.upsertPlacement);
router.get('/notifications', institution.getNotifications);

// Dedicated University Admin routes
router.get('/university/overview', universityAdmin.getUniversityOverview);
router.get('/university/students', universityAdmin.listStudents);
router.get('/university/drives', universityAdmin.listCampusDrives);
router.post('/university/drives', universityAdmin.createCampusDrive);
router.patch('/university/drives/:id', universityAdmin.updateCampusDrive);
router.delete('/university/drives/:id', universityAdmin.deleteCampusDrive);
router.get('/university/drives/:id/applications', universityAdmin.getDriveApplications);
router.patch('/university/applications/:id', universityAdmin.updateStudentApplication);
router.get('/university/placements', universityAdmin.listPlacements);
router.post('/university/placements', universityAdmin.upsertPlacement);
router.patch('/university/placements/:id/verify-retention', universityAdmin.verifyOneYearRetention);
router.post('/university/notifications/dispatch', universityAdmin.dispatchUniversityNotification);

// Dedicated Government Admin routes
router.get('/government/overview', governmentAdmin.getGovernmentOverview);
router.get('/government/programs', governmentAdmin.listTrainingPrograms);
router.post('/government/programs', governmentAdmin.createTrainingProgram);
router.patch('/government/programs/:id', governmentAdmin.updateTrainingProgram);
router.delete('/government/programs/:id', governmentAdmin.deleteTrainingProgram);
router.get('/government/trainees', governmentAdmin.listTrainees);
router.get('/government/placements', governmentAdmin.listTraineePlacements);
router.post('/government/placements', governmentAdmin.upsertTraineePlacement);
router.patch('/government/placements/:id/verify-retention', governmentAdmin.verifyTraineeRetention);
router.post('/government/notifications/dispatch', governmentAdmin.dispatchGovernmentNotification);

module.exports = router;
