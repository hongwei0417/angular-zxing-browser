import { ProcessControlService } from './process-control.service';
import { NgOpenCVService, OpenCVLoadResult } from 'ng-open-cv';
import { ElementRef, Injectable } from '@angular/core';
import { filter } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { ControlValue, ImageProcessHtmlObj } from './DataObject';

@Injectable({
  providedIn: 'root',
})
export class OpencvService {
  loaded = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<any>(false);

  constructor(private ngOpenCVService: NgOpenCVService) {
    this.ngOpenCVService.isReady$
      .pipe(filter((result: OpenCVLoadResult) => result.ready))
      .subscribe(() => {
        console.log(cv);
        this.loaded.next(true);
      });
  }

  matchOneTemplate(htmlObj: ImageProcessHtmlObj, controls: ControlValue) {
    try {
      let originalSrc = cv.imread(htmlObj.original.nativeElement);
      let filteredSrc = cv.imread(htmlObj.original.nativeElement);
      let templateSrc = cv.imread(htmlObj.template.nativeElement);
      let dst = cv.Mat.zeros(filteredSrc.rows, filteredSrc.cols, cv.CV_8UC3);
      let M = new cv.Mat();

      // * 灰階
      cv.cvtColor(filteredSrc, filteredSrc, cv.COLOR_RGBA2GRAY, 0);
      cv.cvtColor(templateSrc, templateSrc, cv.COLOR_RGBA2GRAY, 0);
      // * 閾值
      cv.threshold(
        filteredSrc,
        filteredSrc,
        controls.thresHoldValue,
        255,
        controls.enableThreshold ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY
      );
      //   // * 形態學
      M = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(filteredSrc, filteredSrc, cv.MORPH_OPEN, M);
      M = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.morphologyEx(filteredSrc, filteredSrc, cv.MORPH_CLOSE, M);

      // * 樣板配對
      let mask = new cv.Mat();
      cv.matchTemplate(filteredSrc, templateSrc, dst, cv.TM_CCOEFF, mask);
      let result = cv.minMaxLoc(dst, mask);
      let maxPoint = result.maxLoc;
      let color = new cv.Scalar(255, 0, 0, 255);

      let point = new cv.Point(
        maxPoint.x + templateSrc.cols,
        maxPoint.y + templateSrc.rows
      );
      cv.rectangle(originalSrc, maxPoint, point, color, 2, cv.LINE_8, 0);

      // * 擷取barcode
      let rect = new cv.Rect(
        maxPoint.x,
        maxPoint.y,
        templateSrc.cols,
        templateSrc.rows
      );

      let area = filteredSrc.roi(rect);
      let copyArea = area.clone();
      cv.copyMakeBorder(
        copyArea,
        copyArea,
        30,
        30,
        30,
        30,
        cv.BORDER_CONSTANT,
        new cv.Scalar(255, 255, 255, 255)
      );

      // * 顯示
      cv.imshow(htmlObj.original.nativeElement, originalSrc);
      cv.imshow(htmlObj.filtered.nativeElement, filteredSrc);
      cv.imshow(htmlObj.barcode.nativeElement, copyArea);

      // * 釋放
      originalSrc.delete();
      filteredSrc.delete();
      templateSrc.delete();
      dst.delete();
      M.delete();
      mask.delete();
      area.delete();
      copyArea.delete();
    } catch (error) {
      this.error$.next(error);
    }
  }

  contours(htmlObj: ImageProcessHtmlObj, controls: ControlValue) {
    try {
      let originalSrc = cv.imread(htmlObj.original.nativeElement);
      let filteredSrc = cv.imread(htmlObj.filtered.nativeElement);
      let barcodeSrc = cv.imread(htmlObj.barcode.nativeElement);
      let dst = cv.Mat.zeros(filteredSrc.rows, filteredSrc.cols, cv.CV_8UC3);
      let M = new cv.Mat();
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();

      // * 灰階
      cv.cvtColor(originalSrc, filteredSrc, cv.COLOR_RGBA2GRAY);

      // * 校色板
      let blockSize = 32;
      let average = cv.mean(filteredSrc)[0];
      let subRows = Math.ceil(filteredSrc.rows / blockSize);
      let subCols = Math.ceil(filteredSrc.cols / blockSize);
      let blockImage = new cv.Mat.zeros(subRows, subCols, cv.CV_32FC1);

      for (let i = 0; i < subRows; i++) {
        for (let j = 0; j < subCols; j++) {
          let rowMin = i * blockSize;
          let rowMax = (i + 1) * blockSize;
          let colMin = j * blockSize;
          let colMax = (j + 1) * blockSize;
          if (rowMax > filteredSrc.rows) rowMax = filteredSrc.rows;
          if (colMax > filteredSrc.cols) colMax = filteredSrc.cols;

          let rect = new cv.Rect(
            colMin,
            rowMin,
            colMax - colMin,
            rowMax - rowMin
          );
          let roi = new cv.Mat();
          roi = filteredSrc.roi(rect);
          let temaver = cv.mean(roi)[0];
          blockImage.floatPtr(i, j)[0] = temaver;
          roi.delete();
        }
      }

      for (let i = 0; i < subRows; i++) {
        for (let j = 0; j < subCols; j++) {
          blockImage.floatPtr(i, j)[0] -= average;
        }
      }

      let tempResult = new cv.Mat();
      let blockImage2 = new cv.Mat();
      let tempSrc = new cv.Mat();
      cv.resize(
        blockImage,
        blockImage2,
        filteredSrc.size(),
        0,
        0,
        cv.INTER_CUBIC
      );
      filteredSrc.convertTo(tempSrc, cv.CV_32FC1);
      cv.subtract(tempSrc, blockImage2, tempResult);
      tempResult.convertTo(filteredSrc, cv.CV_8UC1);

      tempSrc.delete();
      blockImage.delete();
      blockImage2.delete();
      tempResult.delete();

      // * 生成棋盤格
      // for (let i = 0; i < src2.rows; i++) {
      //   for (let j = 0; j < src2.cols; j++) {
      //     if ((Math.floor(i / 50) + Math.floor(j / 50)) % 2) {
      //       // src2.ucharPtr(i, j)[0] = 255;
      //       // src2.ucharPtr(i, j)[1] = 255;
      //       // src2.ucharPtr(i, j)[2] = 255;
      //       // src2.ucharPtr(i, j)[3] = 50;
      //     } else {
      //       // src2.ucharPtr(i, j)[0] = 0;
      //       // src2.ucharPtr(i, j)[1] = 0;
      //       // src2.ucharPtr(i, j)[2] = 0;
      //       // src2.ucharPtr(i, j)[3] = 255;
      //     }
      //   }
      // }

      // * 一般二值化
      // let grayRGBA = filteredSrc.clone();
      // cv.cvtColor(grayRGBA, grayRGBA, cv.COLOR_GRAY2RGBA);
      // let imageData = new ImageData(
      //   new Uint8ClampedArray(grayRGBA.data),
      //   grayRGBA.cols,
      //   grayRGBA.rows
      // );
      // grayRGBA.delete();

      // if (this.enableThreshold) {
      //   // this.areaThreshold(imageData, 200, 200);
      //   this.OTSU(imageData.data, imageData.width * imageData.height);
      // }
      // filteredSrc = cv.matFromImageData(imageData);
      // cv.cvtColor(filteredSrc, filteredSrc, cv.COLOR_RGBA2GRAY);
      cv.threshold(
        filteredSrc,
        filteredSrc,
        controls.thresHoldValue,
        255,
        cv.THRESH_OTSU +
          (controls.enableThreshold ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY)
      );

      // * 區域二值化
      // const BLOCK_SIZE = src.rows / 8;
      // let subHeight = Math.floor(src.rows / BLOCK_SIZE);
      // let subWidth = Math.floor(src.cols / BLOCK_SIZE);
      // for (let i = 0; i < subHeight; i++) {
      //   for (let j = 0; j < subWidth; j++) {
      //     let r = new cv.Mat();
      //     let t = new cv.Rect(
      //       j * BLOCK_SIZE,
      //       i * BLOCK_SIZE,
      //       BLOCK_SIZE,
      //       BLOCK_SIZE
      //     );
      //     r = src.roi(t);
      //     cv.threshold(
      //       r,
      //       r,
      //       this.thresHoldValue,
      //       255,
      //       cv.THRESH_OTSU +
      //         (this.enableInvertColor ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY)
      //     );
      //     r.delete();
      //   }
      // }

      // * ADAPTIVE_THRESH_GAUSSIAN_C
      // cv.adaptiveThreshold(
      //   filteredSrc,
      //   filteredSrc,
      //   this.thresHoldValue || 255,
      //   cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      //   this.enableInvertColor ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY,
      //   321,
      //   3
      // );
      // cv.threshold(
      //   src,
      //   src,
      //   this.thresHoldValue,
      //   255,
      //   (this.enableInvertColor ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY) +
      //     cv.THRESH_OTSU
      //   // cv.THRESH_TRIANGLE
      //   // this.enableInvertColor ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY
      // );

      // * 形態學
      M = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      cv.morphologyEx(filteredSrc, filteredSrc, cv.MORPH_OPEN, M);
      M = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.morphologyEx(filteredSrc, filteredSrc, cv.MORPH_CLOSE, M);
      M = cv.Mat.ones(6, 6, cv.CV_8U);
      // cv.erode(
      //   src,
      //   src,
      //   M,
      //   new cv.Point(-1, -1),
      //   1,
      //   cv.BORDER_CONSTANT,
      //   cv.morphologyDefaultBorderValue()
      // );

      // * 模糊
      // cv.GaussianBlur(filteredSrc, filteredSrc, new cv.Size(9, 9), 0, 0, cv.BORDER_DEFAULT);
      // cv.bilateralFilter(filteredSrc, filteredSrc, 9, 75, 75, cv.BORDER_DEFAULT);

      // * 輪廓偵測
      cv.findContours(
        filteredSrc,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      // * 畫輪廓
      // for (let i = 0; i < contours.size(); ++i) {
      //   let color = new cv.Scalar(255, 255, 255);
      //   cv.drawContours(dst, contours, i, color, 1, 8, hierarchy, 100);
      // }

      // * 邊界矩型
      let maxIndex = null;
      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let rect = cv.boundingRect(cnt);
        let color = new cv.Scalar(255, 0, 0, 255);
        let point1 = new cv.Point(rect.x, rect.y);
        let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);

        let maxRect = this.getRectInfo(contours, maxIndex || 0);
        let currRect = this.getRectInfo(contours, i);

        if (
          currRect.rectArea > 10000 &&
          currRect.aspectRatio > 0.9 &&
          // currRect.extent > 0.3 &&
          currRect.rectArea > maxRect.rectArea // 找最大面積
        ) {
          maxIndex = i;
        }

        cv.rectangle(originalSrc, point1, point2, color, 2, cv.LINE_AA, 0);
        cnt.delete();
      }

      // * 擷取和畫出目標矩形
      if (maxIndex) {
        let maxRect = this.getRectInfo(contours, maxIndex);
        let color = new cv.Scalar(255, 255, 0, 255);
        let point1 = new cv.Point(maxRect.rect.x, maxRect.rect.y);
        let point2 = new cv.Point(
          maxRect.rect.x + maxRect.rect.width,
          maxRect.rect.y + maxRect.rect.height
        );
        let roiRect = new cv.Mat();
        let r = new cv.Rect(
          maxRect.rect.x,
          maxRect.rect.y,
          maxRect.rect.width,
          maxRect.rect.height
        );
        roiRect = filteredSrc.roi(r).clone();
        cv.threshold(
          roiRect,
          roiRect,
          controls.thresHoldValue,
          255,
          cv.THRESH_BINARY_INV
        );
        cv.copyMakeBorder(
          roiRect,
          barcodeSrc,
          200,
          200,
          200,
          200,
          cv.BORDER_CONSTANT,
          new cv.Scalar(255, 255, 255, 255)
        );
        cv.rectangle(originalSrc, point1, point2, color, 2, cv.LINE_AA, 0);
        roiRect.delete();
      }

      // * 顯示
      cv.imshow(htmlObj.original.nativeElement, originalSrc);
      cv.imshow(htmlObj.filtered.nativeElement, filteredSrc);
      cv.imshow(htmlObj.barcode.nativeElement, barcodeSrc);
      if (barcodeSrc.size().width && barcodeSrc.size().height) {
      }

      // * 釋放
      originalSrc.delete();
      filteredSrc.delete();
      barcodeSrc.delete();
      dst.delete();
      M.delete();
      contours.delete();
      hierarchy.delete();
    } catch (error) {
      this.error$.next(error);
    }
  }

  getRectInfo(contours: any, i: number) {
    let cnt = contours.get(i);
    let rect = cv.boundingRect(cnt);
    let area = cv.contourArea(cnt, false);
    let rectArea = rect.width * rect.height; //矩形面積
    let extent = area / rectArea; // 輪廓面積占矩形面積比
    let aspectRatio =
      rect.height > rect.width
        ? rect.width / rect.height
        : rect.height / rect.width; // 長寬比
    // console.log(rect, rectArea, extent, aspectRatio);
    return { rect, rectArea, extent, aspectRatio };
  }
}
