// src/utils/autoAlign.ts

// 1. 加载图片工具
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // 允许跨域读取像素（如果是本地服务器或同源）
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

// 2. 核心算法：计算接口宽度 (对应 Python 的 get_interface_width)
const getInterfaceWidth = (
  img: HTMLImageElement,
  position: 'top' | 'bottom',
  sampleRows: number = 5
): number => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  // 将图片画到画布上
  ctx.drawImage(img, 0, 0);
  
  // 获取所有像素数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data; // [r, g, b, a, r, g, b, a, ...]
  const width = canvas.width;
  const height = canvas.height;

  // 找到所有非透明像素的垂直范围 (裁剪空白逻辑的简化版)
  // 为了性能，我们只扫描我们需要的那一端
  
  let widths: number[] = [];
  
  if (position === 'bottom') {
    // 从底部向上扫描 sampleRows 行
    // 我们先找到最底部的非透明像素在哪，避免扫描纯空白
    let foundBottom = false;
    let startY = height - 1;
    
    // 快速扫描找到实际物体底部
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 50) {
          startY = y;
          foundBottom = true;
          break;
        }
      }
      if (foundBottom) break;
    }

    if (!foundBottom) return 0;

    // 计算这几行的宽度
    for (let y = startY; y > Math.max(startY - sampleRows, 0); y--) {
      let minX = width;
      let maxX = 0;
      let hasPixel = false;
      
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          hasPixel = true;
        }
      }
      if (hasPixel) widths.push(maxX - minX);
    }
  } 
  else if (position === 'top') {
    // 从顶部向下扫描
    let foundTop = false;
    let startY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 50) {
          startY = y;
          foundTop = true;
          break;
        }
      }
      if (foundTop) break;
    }

    if (!foundTop) return 0;

    for (let y = startY; y < Math.min(startY + sampleRows, height); y++) {
      let minX = width;
      let maxX = 0;
      let hasPixel = false;
      
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 50) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          hasPixel = true;
        }
      }
      if (hasPixel) widths.push(maxX - minX);
    }
  }

  if (widths.length === 0) return 0;
  // 返回平均宽度
  return widths.reduce((a, b) => a + b, 0) / widths.length;
};

// 3. 计算最终对齐参数
export interface AlignmentResult {
  neckScale: number; // 相对于 Body 的缩放比例
  baseScale: number; // 相对于 Body 的缩放比例
}

export const calculateAlignment = async (
  neckUrl: string,
  bodyUrl: string,
  baseUrl: string
): Promise<AlignmentResult> => {
  try {
    // 并行加载三张图
    const [neckImg, bodyImg, baseImg] = await Promise.all([
      loadImage(neckUrl),
      loadImage(bodyUrl),
      loadImage(baseUrl)
    ]);

    // 测量接口宽度
    // Neck: 测底部
    // Body: 测顶部 和 底部
    // Base: 测顶部
    const wNeckBottom = getInterfaceWidth(neckImg, 'bottom');
    const wBodyTop = getInterfaceWidth(bodyImg, 'top');
    const wBodyBottom = getInterfaceWidth(bodyImg, 'bottom');
    const wBaseTop = getInterfaceWidth(baseImg, 'top');

    // 安全检查，防止除以0
    if (wNeckBottom < 1 || wBaseTop < 1) {
        console.warn("无法检测到接口宽度，使用默认比例");
        return { neckScale: 1, baseScale: 1 };
    }

    // 计算缩放比例 (目标: NeckBottom = BodyTop)
    // 逻辑：如果 Body 显示宽度为 W，则 BodyTop 物理像素宽度对应屏幕宽度。
    // 我们需要的是相对宽度的比例。
    // 公式: (BodyTop / NeckBottom) * (NeckOriginalWidth / BodyOriginalWidth) 
    // 但在 CSS 中我们通常固定 Body 宽度，这里我们直接返回相对于 Body 宽度的倍率修正。
    
    // 简单来说：
    // 当 Body 缩放到任意大小时，其接口宽度变为 k * wBodyTop
    // Neck 需要缩放到其接口宽度也为 k * wBodyTop
    // NeckCurrentInterface = k_neck * wNeckBottom
    // => k_neck * wNeckBottom = k * wBodyTop
    // => k_neck = k * (wBodyTop / wNeckBottom)
    
    // 我们返回这个比率因子： width_neck = width_body * (wBodyTop / wNeckBottom) * (neckImg.width / bodyImg.width) ? 
    // 不，最简单的 CSS 实现方式是：
    // NeckWidthPixels = BodyWidthPixels * (wBodyTop / wBodyWidth) / (wNeckBottom / wNeckWidth)
    // 即: ScaleFactor = (wBodyTop / wNeckBottom) 
    // 但是 CSS width 是整张图的宽度。
    
    // Python逻辑：
    // new_neck_w = int(neck.width * (w_body_top / w_neck_bottom))
    // 假设 body 缩放到标准宽，那么 scale_factor = w_body_top / w_neck_bottom 是针对“接口像素”的。
    // 针对整图宽度的 CSS 比例应该是：
    
    const neckScaleRatio = (wBodyTop / wNeckBottom) * (neckImg.width / bodyImg.width);
    // 等等，Python代码里是：scale_neck = w_body_top / w_neck_bottom (这是个纯倍数)
    // 然后 neck.resize(neck.width * scale_neck)
    // Body 之前被 resize 到了 base_width_standard。
    // 所以这里的逻辑相对复杂。
    
    // 前端 CSS 方案最简单解法：
    // 我们需要算出：如果 Body 显示宽度是 300px，Neck 应该显示多少 px？
    // NeckDisplayWidth = 300px * (BodyTop_Px / BodyTotalWidth_Px) / (NeckBottom_Px / NeckTotalWidth_Px)
    
    const neckRatio = (wBodyTop / bodyImg.width) / (wNeckBottom / neckImg.width);
    const baseRatio = (wBodyBottom / bodyImg.width) / (wBaseTop / baseImg.width);
    
    return {
      neckScale: neckRatio, // 如果 Body 宽 100px，Neck 宽就是 100 * neckRatio
      baseScale: baseRatio
    };

  } catch (e) {
    console.error("Auto align calculation failed", e);
    return { neckScale: 1, baseScale: 1 };
  }
};