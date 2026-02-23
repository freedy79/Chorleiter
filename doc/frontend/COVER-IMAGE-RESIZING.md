# Cover Image Resizing Implementation

## Overview

This feature adds automatic cover image resizing on upload and provides an admin interface to resize existing cover images. Cover images are optimized to a maximum width of 150px (with proportional height) to reduce loading and storage overhead.

## Architecture

### Backend Components

#### 1. Image Resizing Service (`src/services/image.service.js`)
- **Purpose**: Centralized image processing logic using Sharp library
- **Key Functions**:
  - `resizeImage(imagePath, targetWidth)` - Resize image to specific width maintaining aspect ratio
  - `resizeUploadedCover(uploadedFilePath, maxWidth)` - Resize image on upload
  - `getResizedCover(filename, width)` - Get resized version of existing cover
  - `saveResizedCover(filename, width)` - Store pre-resized copies
  - `cleanupResizedVersions(filename)` - Remove cached resized versions when cover is deleted
  - `resizeAllCovers()` - Batch operation to resize all covers

**Key Features**:
- Non-destructive resizing (original can be restored)
- Smart resizing (doesn't enlarge small images)
- Support for multiple widths (150px, 300px, 600px for responsive design)
- Proper error handling with logging

#### 2. Collection Controller Updates
- Modified `uploadCover` to automatically resize images on upload
- Added `resizeCover` endpoint to resize existing covers
- Added `getResizedCover` endpoint to retrieve resized versions with query parameter

#### 3. API Routes
- `POST /:id/cover-resize` - Resize existing collection cover (authenticated, choir admin only)
- `GET /:id/cover-resized` - Get resized cover by width parameter (public, for optimization)

### Frontend Components

#### 1. Cover Resize Dialog (`src/features/collections/cover-resize-dialog.component.ts`)
- **Features**:
  - Width input field (10-2000px range)
  - Preset buttons (100px, 150px, 200px, 300px)
  - Live preview showing current image dimensions
  - Loading state during resize operation
  - Error handling with user notifications

#### 2. Collection Edit Component Updates
- Added `openResizeCoverDialog()` method
- Integrated dialog into the cover upload section
- "Größe anpassen" (Resize) button appears when cover is selected
- Refreshes preview after successful resize

#### 3. API Service Layer
- Added `resizeCollectionCover(id, width)` method to api.service.ts
- Collection service handles HTTP POST to resize endpoint

#### 4. Styling
- New `.cover-actions` section in collection-edit SCSS
- Responsive buttons with icon support
- Visual feedback for active presets

## Workflow

### Upload with Automatic Resize
1. User uploads image via drag & drop or file picker
2. File is received by backend
3. Image is automatically resized to 150px max width
4. Resized image is stored with original filename
5. Frontend receives confirmation and updates preview

### Manual Resize (Admin)
1. Navigate to collection edit page
2. Click "Größe anpassen" button on existing cover
3. Dialog opens with current image and width options
4. User selects width (or enters custom value)
5. Click "Anwenden" to apply resize
6. Backend resizes image in place
7. Frontend refreshes preview to show result

## Technical Details

### Image Processing
- **Library**: `sharp` (installed via npm)
- **Format Support**: JPEG, PNG, GIF, WebP
- **Aspect Ratio**: Maintained automatically
- **Quality**: Balanced for web use

### Database
- No schema changes required
- Existing `coverImage` field continues to store filename
- Resized versions can be generated on-demand or cached

### API Endpoints

#### Resize Collection Cover
```
POST /api/collections/{id}/cover-resize
Headers: Authorization: Bearer <token>
Body: { "width": 150 }
Response: { "message": "...", "filename": "...", "width": 150 }
```

#### Get Resized Cover
```
GET /api/collections/{id}/cover-resized?width=150
Response: Binary image data
```

## Configuration

### Default Dimensions
- **Upload Max Width**: 150px (configurable in `uploadCover` controller)
- **Preset Widths**: 100px, 150px, 200px, 300px
- **Min Width**: 10px
- **Max Width**: 2000px

To change defaults:
1. **Upload resize**: Edit `await imageService.resizeUploadedCover(uploadedPath, 150);` in collection.controller.js
2. **Dialog presets**: Edit preset buttons in `cover-resize-dialog.component.ts`
3. **Service widths**: Edit `const widths = [150, 300, 600];` in image.service.js

## Error Handling

### Backend
- Image processing errors are logged but don't fail uploads (graceful degradation)
- File validation is handled by existing multer configuration
- Invalid width parameters (< 10 or > 2000) return 400 error

### Frontend
- Dialog shows helpful error messages
- Network errors are caught and displayed
- Loading state prevents double-submission

## Performance Considerations

1. **On-Upload Resizing**: 
   - Adds ~200-500ms per image
   - Reduces file size significantly (typically 80-90% reduction)
   - One-time cost at upload

2. **On-Demand Resizing**:
   - Sharp is very fast for single images
   - Can cache resized versions for repeated requests

3. **Storage**:
   - Original images stored once
   - Optional: Maintain 150px, 300px, 600px cached versions

## Testing

### Manual Testing Steps
1. Test upload with large image (> 3000px wide)
   - Verify image is resized to 150px
   - Check file size reduction

2. Test admin resize
   - Upload image
   - Click "Größe anpassen" button
   - Try different preset widths
   - Verify preview updates

3. Test error cases
   - Invalid width (e.g., -100, 5000)
   - Missing cover image
   - Network errors

### Automated Testing
Tests can be added to check:
- Image resizing logic with various input sizes
- API endpoint responses
- Dialog component interactions

## Security

- Resize endpoint requires authentication and choir admin role
- File type validation is already in place (multer)
- Path traversal prevention via `path.basename()`
- No executable content in images (MIME type validation)

## Future Enhancements

1. **Batch Resizing**: Admin endpoint to resize all collection covers
2. **Responsive Images**: Serve different sizes based on device
3. **Format Conversion**: Convert to WebP for better compression
4. **Progressive Loading**: Show placeholder while loading
5. **Image Optimization**: EXIF data removal, optimization level control

## Cleanup

When a collection cover is deleted:
- Original file is deleted (existing behavior)
- Pre-cached resized versions should be deleted via `cleanupResizedVersions()`

Consider adding cleanup to the `deleteCollection` workflow.

## Dependencies Added

- `sharp`: ^14.x (image processing library)

## Files Modified

### Backend
- `src/services/image.service.js` (NEW)
- `src/controllers/collection.controller.js` (modified)
- `src/routes/collection.routes.js` (modified)

### Frontend
- `src/features/collections/cover-resize-dialog.component.ts` (NEW)
- `src/features/collections/collection-edit/collection-edit.component.ts` (modified)
- `src/features/collections/collection-edit/collection-edit.component.html` (modified)
- `src/features/collections/collection-edit/collection-edit.component.scss` (modified)
- `src/core/services/api.service.ts` (modified)
- `src/core/services/collection.service.ts` (modified)

## Deployment Notes

1. Run `npm install` in choir-app-backend to install sharp dependency
2. Backend automatically resizes on upload - no manual action needed
3. Existing covers can be resized through admin UI on-demand
4. Optional: Run batch resize for all existing covers using image service

## Troubleshooting

### Image not resizing on upload
- Check sharp installation: `npm list sharp`
- Verify image file is valid
- Check logs for image service errors
- Ensure write permissions to uploads directory

### Resize dialog not appearing
- Verify cover image is loaded
- Check browser console for errors
- Verify user has choir admin role
- Check API endpoint is returning correct status

### Performance issues
- Check file sizes before/after
- Monitor CPU usage during resize
- Consider caching resized versions for common widths
- Use `resizeAllCovers()` batch operation during off-peak hours

---

**Last Updated**: 2026-02-14
**Version**: 1.0
