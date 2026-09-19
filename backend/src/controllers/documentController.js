const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const Document = require('../models/Document');
const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');
const { extractSkillsFromText } = require('../utils/skillExtractor');
const { generateCredentialId } = require('../utils/ids');
const { recomputeProfileStats } = require('../utils/recomputeProfile');
const { UPLOAD_DIR } = require('../middleware/upload');
const { uploadFile } = require('../services/cloudinaryService');

// GET /api/documents
const getMyDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ documents });
});

// GET /api/documents/:id/file — authenticated download of the original upload
const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, user: req.user._id });
  if (!document) return res.status(404).json({ message: 'Document not found.' });

  const filePath = path.join(UPLOAD_DIR, document.storedFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ message: 'The stored file is no longer available.' });
  }

  res.download(filePath, document.originalName);
});

// Runs synchronously right after upload for simplicity. For large volumes,
// move this into a background job queue (BullMQ, Agenda, etc.) and let the
// client poll GET /api/documents/:id for status instead.
async function extractAndSave(document, filePath, mimeType, userId) {
  document.status = 'PARSING';
  await document.save();

  try {
    let text = '';
    if (mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
    } else {
      // No OCR pipeline wired up yet for images/Word docs — mark parsed
      // with zero extracted skills rather than pretending to have read it.
      document.status = 'PARSED';
      document.extractedSkills = [];
      await document.save();
      return { newSkillCount: 0 };
    }

    const found = extractSkillsFromText(text);
    const savedNames = [];

    for (const skill of found) {
      const alreadyHas = await Skill.findOne({ user: userId, name: skill.name });
      if (alreadyHas) continue;

      await Skill.create({
        user: userId,
        name: skill.name,
        score: skill.score,
        category: skill.category,
        level: skill.level,
        verifiedBy: 'Skill-Setu Document Extraction (keyword-based)',
        verifiedDate: new Date(),
        credentialId: generateCredentialId(skill.name),
        status: 'VALIDATED',
        source: 'Document Extraction'
      });
      savedNames.push(skill.name);
    }

    document.status = 'PARSED';
    document.extractedSkills = savedNames;
    await document.save();

    return { newSkillCount: savedNames.length };
  } catch (err) {
    document.status = 'FAILED';
    document.failureReason = err.message;
    await document.save();
    return { newSkillCount: 0, error: err.message };
  }
}

// POST /api/documents/upload  (multipart/form-data, field name "file")
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Use the "file" form field.' });
  }

  const documentType = req.body.documentType || (req.user.role === 'trainee' ? 'certificate' : 'cv');
  const folder = documentType === 'certificate' ? 'skill-setu/certificates' : 'skill-setu/cv';

  const document = await Document.create({
    user: req.user._id,
    originalName: req.file.originalname,
    storedFilename: req.file.filename,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    documentType,
    status: 'UPLOADED'
  });

  const remoteFile = await uploadFile(req.file.path, folder, 'auto');
  if (remoteFile) {
    document.storageUrl = remoteFile.secure_url;
    await document.save();
  }

  const { newSkillCount, error } = await extractAndSave(
    document,
    req.file.path,
    req.file.mimetype,
    req.user._id
  );

  if (newSkillCount > 0) {
    await recomputeProfileStats(req.user);
  }

  res.status(201).json({
    document,
    newSkillsFound: newSkillCount,
    extractionError: error
  });
});

module.exports = { getMyDocuments, downloadDocument, uploadDocument };
