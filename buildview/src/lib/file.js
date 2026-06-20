// Photos are stored inline as base64 in localStorage, which has a small total
// quota (~5MB). Cap a single image so one upload can't blow the whole store.
// base64 inflates size ~33%, so this keeps a data URL well under ~3MB.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB original

export function imageTooLarge(file) {
  return !!file && file.size > MAX_IMAGE_BYTES;
}

// Read a File (from <input type="file">) as a base64 data URL.
// Used to store photos inline for the prototype (section 2: "store the image
// as a local reference or base64; keep it simple").
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
