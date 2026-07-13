import {createCanvas} from 'canvas';

export async function GenerateImage({message}) {
  // Generate an image using an image library
  const canvas = createCanvas(200, 70);
  const ctx = canvas.getContext('2d');
  ctx.font = '20px Impact';
  ctx.rotate(-0.1);
  ctx.fillText(message, 10, 50);

  // Rasterize into a Blob with a mime type
  const type = 'image/png';
  const blob = new Blob([canvas.toBuffer(type)], {type});

  // Just pass it to React
  return <img src={blob} />;
}
