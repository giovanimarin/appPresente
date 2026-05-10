import { Router } from 'express';
import { authenticate, requireStaff, requireGuardian } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { requestUploadSchema, confirmUploadSchema } from './uploads.schemas';
import { requestUpload, confirmUpload, getDownloadUrl, deleteAttachment, requestGuardianUpload } from './uploads.controller';

const router = Router();

// Guardian: Request presigned URL for form field file upload
router.post('/guardian/request', authenticate, requireGuardian, requestGuardianUpload);

// Request a presigned upload URL
router.post('/request', authenticate, requireStaff, validate(requestUploadSchema), requestUpload);

// Confirm file was uploaded and create attachment record
router.post('/confirm', authenticate, requireStaff, validate(confirmUploadSchema), confirmUpload);

// Get a presigned download URL
router.get('/:id/download', authenticate, getDownloadUrl);

// Delete attachment
router.delete('/:id', authenticate, requireStaff, deleteAttachment);

export default router;
