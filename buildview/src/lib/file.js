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
