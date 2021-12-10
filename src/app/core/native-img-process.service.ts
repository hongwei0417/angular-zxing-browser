import { ProcessControlService } from './process-control.service';
import { ScannerService } from './scanner.service';
import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ControlValue } from './DataObject';

@Injectable({
  providedIn: 'root',
})
export class NativeImgProcessService {
  error$ = new BehaviorSubject<any>(false);
  controls: ControlValue;

  constructor(private scannerService: ScannerService) {}

  // * 進行影像處理
  imageFilter(canvas: ElementRef<HTMLCanvasElement>, _controls: ControlValue) {
    try {
      const { x0, y0, cropWidth, cropHeight } = this.scannerService.cropData;
      const snapShotCtx = canvas.nativeElement.getContext('2d');
      const imageData = snapShotCtx.getImageData(
        0,
        0,
        cropWidth * this.scannerService.zoomRatio$.getValue(),
        cropHeight * this.scannerService.zoomRatio$.getValue()
      );
      this.controls = _controls;

      if (this.controls.enableGrayscale) this.grayscale(imageData.data);
      if (this.controls.enableEqualization) this.equalization(imageData.data);
      if (this.controls.enableInvertColor) this.invertColors(imageData.data);
      if (this.controls.enableBlur)
        this.blur(imageData, this.controls.blurValue, 1);
      if (this.controls.enableThreshold) {
        this.OTSU(imageData.data, imageData.width * imageData.height);
      }
      this.thresHold(imageData.data);
      snapShotCtx.putImageData(imageData, 0, 0);
    } catch (error) {
      this.error$.next(error);
    }
  }

  // * 反轉
  invertColors(data: Uint8ClampedArray): void {
    for (var i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // red
      data[i + 1] = 255 - data[i + 1]; // green
      data[i + 2] = 255 - data[i + 2]; // blue
    }
  }

  // * 灰階
  grayscale(data: Uint8ClampedArray): void {
    for (var i = 0; i < data.length; i += 4) {
      let avg =
        data[i] ^
        (2.2 * 0.2973 + data[i + 1]) ^
        (2.2 * 0.6274 + data[i + 2]) ^
        (2.2 * 0.0753) ^
        (1 / 2.2); // ? adobe PS algo
      // let avg = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      // avg = avg <= 0.0031308 ? 12.92 * avg : (avg ^ (1 / 2.4)) * 1.055 - 0.055;
      avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

      data[i] = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
  }

  // * 直方圖均衡化(Histogram Equalization)
  equalization(data: Uint8ClampedArray) {
    let histogram = new Array<number>(255); //每個灰度值出現次數(灰階直方圖)
    let CDF = new Array<number>(255); //累積分布函數

    //初始化
    for (let i = 0; i < 256; i++) {
      histogram[i] = 0;
      CDF[i] = 0;
    }

    //統計圖像灰度分布(灰階值方圖)
    for (let i = 0; i < data.length; i += 4) {
      // 灰階圖像r=g=b，取其中一個就好
      let r = data[i];
      histogram[r]++;
    }

    //計算累積分布函數
    for (let i = 0; i < 256; i++) {
      CDF[i] = i > 0 ? histogram[i] + CDF[i - 1] : histogram[i];
    }

    //均勻化
    for (let i = 0; i < data.length; i += 4) {
      let value = Math.round((CDF[data[i]] / CDF[255]) * 255);
      data[i] = value; // red
      data[i + 1] = value; // green
      data[i + 2] = value; // blue
    }
    // console.log(histogram);
  }

  // * 閾值(二值化)
  thresHold(data: Uint8ClampedArray) {
    for (var i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      let value = r <= this.controls.thresHoldValue ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = value;
      // data[i] = data[i] > this.thresHoldValue ? 0 : data[i];
      // data[i + 2] = data[i + 2] > this.thresHoldValue ? 0 : data[i] + 2;
      // data[i + 1] = data[i + 1] > this.thresHoldValue ? 0 : data[i + 1];
      // data[i + 3] = data[i + 3] > this.thresHoldValue ? 0 : data[i + 3];
    }
  }

  // ! 區域二值化(有問題)
  areaThreshold(img: ImageData, blockWidth: number, blockHeight: number) {
    const width = img.width; // 寬度(pixel)
    const height = img.height; // 高度(pixel)
    const subWidth = Math.floor(img.width / blockWidth); // 區域寬度
    const subHeight = Math.floor(img.height / blockHeight); // 區域高度
    const widthSize = width * 4; //  寬度資料數量
    const heightSize = height * widthSize; // 高度資料數量

    console.log(width, height);
    console.log(subWidth, subHeight);
    console.log(widthSize, heightSize);

    let result = [];
    for (let y = 0; y < subHeight + 1; y++) {
      const yOffset = y * blockHeight; // y的起始行數
      const yStart = yOffset * widthSize; // y的起始位置
      for (let yy = 0; yy < blockHeight; yy++) {
        // 處理一整行區塊
        const yyStart = yStart + yy * widthSize;
        if (yyStart < heightSize) {
          for (let x = 0; x < subWidth + 1; x++) {
            const xOffset = x * blockWidth * 4; // x的起始列數
            const xStart = yyStart + xOffset; // x的起始位置
            let subResult = [];
            // 處理一個區塊
            for (let xx = 0; xx < blockWidth * 4; xx += 4) {
              let curr = xStart + xx; // 目前資料位置
              let max = (yOffset + yy + 1) * widthSize; // 該行最大位置
              if (curr < max) {
                subResult.push(curr);
              }
            }
            // 紀錄結果
            let blockIndex = x + y * (subWidth + 1); // 取得該區塊的編號
            if (result[blockIndex]) {
              result[blockIndex].push(...subResult);
            } else {
              result[blockIndex] = subResult;
            }
          }
        }
      }
    }

    // 二值化處理
    for (let i = 0; i < result.length; i++) {
      const blockData = [];
      for (let j = 0; j < result[i].length; j++) {
        let index = result[i][j];
        blockData.push(img.data[index]);
        blockData.push(img.data[index + 1]);
        blockData.push(img.data[index + 2]);
        blockData.push(img.data[index + 3]);
      }
      const threshold = this.OTSU(
        new Uint8ClampedArray(blockData),
        result[i].length
      );
      console.log(threshold);
      for (var j = 0; j < blockData.length; j += 4) {
        let r = blockData[i];
        let value = r >= threshold ? 255 : 0;
        let index = result[i][j / 4];
        img.data[index] = img.data[index + 1] = img.data[index + 2] = value;
      }
    }
    console.log(img.data);
  }

  // * 一維OTSU(大津演算法)
  OTSU(data: Uint8ClampedArray | any, size: number) {
    let histogram = new Array<number>(255); //每個灰度值出現次數(灰階直方圖)
    let pHistogram = new Array<number>(255); //每個灰度值出現比例(機率)
    let sumPHistogram = new Array<number>(255); //每個灰度比例之和
    let wHistogram = new Array<number>(255); //每個灰度的比例*權重
    let sumWHistogram = new Array<number>(255); //每個灰度的比例*權重之和
    let temp = 0; //臨時變量
    let sigma2Max = 0; //最大類間方差(變異數差)
    let threshold = 0; //最好閾值

    //初始化
    for (let i = 0; i < 256; i++) {
      histogram[i] = 0;
      pHistogram[i] = 0;
      sumPHistogram[i] = 0;
      wHistogram[i] = 0;
    }

    //統計圖像灰度分布(灰階值方圖)
    for (let i = 0; i < data.length; i += 4) {
      // 灰階圖像r=g=b，取其中一個就好
      let r = data[i];
      histogram[r]++;
    }

    //計算每個灰度機率、灰度比例、灰度權重
    for (let i = 0; i < 256; i++) {
      pHistogram[i] = histogram[i] / size;
      wHistogram[i] = i * pHistogram[i];

      sumPHistogram[i] =
        i > 0 ? pHistogram[i] + sumPHistogram[i - 1] : pHistogram[i];
      sumWHistogram[i] =
        i > 0 ? wHistogram[i] + sumWHistogram[i - 1] : wHistogram[i];
    }

    //將區塊分為A、B區域，並從0~255中分別計算OTSU值並找出最大值作為分割閾值
    for (let i = 0; i < 256; i++) {
      let pA = sumPHistogram[i]; //A區塊機率和
      let pB = 1 - pA; //B區塊機率和
      let wpA = sumWHistogram[i]; //A區塊機率權重和
      let wpB = sumWHistogram[255] - wpA; //B區塊機率權重和
      let uA = wpA / pA; //A區塊平均灰度值
      let uB = wpB / pB; //B區塊平均灰度值

      //計算類間變異數差(OTSU)
      temp = pA * pB * Math.pow(uA - uB, 2); //類間方差公式
      if (temp > sigma2Max) {
        sigma2Max = temp;
        threshold = i;
      }
    }
    this.controls.thresHoldValue = threshold;
    return threshold;
  }

  // * 模糊
  blur(imageData: ImageData, radius = 10, quality = 1) {
    var pixels = imageData.data;
    var width = imageData.width;
    var height = imageData.height;

    var rsum, gsum, bsum, asum, x, y, i, p, p1, p2, yp, yi, yw;
    var wm = width - 1;
    var hm = height - 1;
    var rad1x = radius + 1;
    var divx = radius + rad1x;
    var rad1y = radius + 1;
    var divy = radius + rad1y;
    var div2 = 1 / (divx * divy);

    var r = [];
    var g = [];
    var b = [];
    var a = [];

    var vmin = [];
    var vmax = [];

    while (quality-- > 0) {
      yw = yi = 0;

      for (y = 0; y < height; y++) {
        rsum = pixels[yw] * rad1x;
        gsum = pixels[yw + 1] * rad1x;
        bsum = pixels[yw + 2] * rad1x;
        asum = pixels[yw + 3] * rad1x;

        for (i = 1; i <= radius; i++) {
          p = yw + ((i > wm ? wm : i) << 2);
          rsum += pixels[p++];
          gsum += pixels[p++];
          bsum += pixels[p++];
          asum += pixels[p];
        }

        for (x = 0; x < width; x++) {
          r[yi] = rsum;
          g[yi] = gsum;
          b[yi] = bsum;
          a[yi] = asum;

          if (y == 0) {
            vmin[x] = Math.min(x + rad1x, wm) << 2;
            vmax[x] = Math.max(x - radius, 0) << 2;
          }

          p1 = yw + vmin[x];
          p2 = yw + vmax[x];

          rsum += pixels[p1++] - pixels[p2++];
          gsum += pixels[p1++] - pixels[p2++];
          bsum += pixels[p1++] - pixels[p2++];
          asum += pixels[p1] - pixels[p2];

          yi++;
        }
        yw += width << 2;
      }

      for (x = 0; x < width; x++) {
        yp = x;
        rsum = r[yp] * rad1y;
        gsum = g[yp] * rad1y;
        bsum = b[yp] * rad1y;
        asum = a[yp] * rad1y;

        for (i = 1; i <= radius; i++) {
          yp += i > hm ? 0 : width;
          rsum += r[yp];
          gsum += g[yp];
          bsum += b[yp];
          asum += a[yp];
        }

        yi = x << 2;
        for (y = 0; y < height; y++) {
          pixels[yi] = (rsum * div2 + 0.5) | 0;
          pixels[yi + 1] = (gsum * div2 + 0.5) | 0;
          pixels[yi + 2] = (bsum * div2 + 0.5) | 0;
          pixels[yi + 3] = (asum * div2 + 0.5) | 0;

          if (x == 0) {
            vmin[y] = Math.min(y + rad1y, hm) * width;
            vmax[y] = Math.max(y - radius, 0) * width;
          }

          p1 = x + vmin[y];
          p2 = x + vmax[y];

          rsum += r[p1] - r[p2];
          gsum += g[p1] - g[p2];
          bsum += b[p1] - b[p2];
          asum += a[p1] - a[p2];

          yi += width << 2;
        }
      }
    }
  }
}
