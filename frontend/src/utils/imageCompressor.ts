export async function createThumbnail(file: File, maxDimension: number = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        return reject(new Error('Failed to read image file'));
      }
      img.src = e.target.result as string;
    };

    reader.onerror = () => reject(new Error('File reading error'));

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(img.src);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Thumbnail generation failed, using original src:', err);
        resolve(img.src);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    reader.readAsDataURL(file);
  });
}

