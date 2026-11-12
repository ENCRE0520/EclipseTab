/**
 * 校验并测量图片 Blob 的原始尺寸。
 *
 * createImageBitmap 在 Chromium 中不支持 SVG Blob，会直接抛错，
 * 而部分图标服务（如 icon.horse）会对某些域名返回 SVG。
 * 因此失败时改用 objectURL + <img> 探测，SVG 也能拿到 naturalWidth/Height。
 *
 * @returns 有效图片的宽高；无法解码或尺寸无效（<=1px）时返回 null
 */
export const probeImageBlob = async (
  blob: Blob
): Promise<{ width: number; height: number } | null> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    bitmap.close();
    return width > 1 && height > 1 ? { width, height } : null;
  } catch {
    // 继续用 <img> 探测（SVG 等）
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    let settled = false;

    const finish = (result: { width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
      resolve(result);
    };

    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      finish(
        naturalWidth > 1 && naturalHeight > 1
          ? { width: naturalWidth, height: naturalHeight }
          : null
      );
    };
    img.onerror = () => finish(null);
    img.src = url;

    setTimeout(() => finish(null), 5000);
  });
};
