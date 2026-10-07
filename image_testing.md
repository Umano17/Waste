## TEST AGENT PROMPT – IMAGE INTEGRATION RULES ##
- Always use base64-encoded images for all tests and requests.
- Accepted formats: JPEG, PNG, WEBP only. No SVG/BMP/HEIC.
- Do not upload blank, solid-color, or uniform-variance images; images must contain real visual features.
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload; re-detect MIME after transformations.
- If animated, extract first frame only. Resize large images to reasonable bounds.
