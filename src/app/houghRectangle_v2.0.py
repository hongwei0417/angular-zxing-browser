import atexit

import cv2
import numpy as np
import threading

def empty(a):
  pass

class ExceedMaxValue(Exception):
  pass


def houghSquare(img: np.ndarray, length,
                rotate=0,
                minLength=None,
                maxLength=None):
  def AddOneSquare(img: np.ndarray, x, y, edge_length):
    h, w = img.shape
    t = y - edge_length // 2
    l = x - edge_length // 2
    b = t + edge_length
    r = l + edge_length

    lt = 0
    rt = 0
    lb = 0
    rb = 0

    # bottom line
    if b <= h:
      img[b - 1, max(0, l):r] += 1
      if l >= 0:
        lb += 1
      if r <= w:
        rb += 1

    # top line
    if t >= 0:
      img[t, max(l, 0):r] += 1
      if l >= 0:
        lt += 1
      if r <= w:
        rt += 1

    # left line
    if l >= 0:
      img[max(0, t):b, l] + 1
      if t >= 0:
        lt += 1
      if b <= h:
        lb += 1

    # right line
    if r <= w:
      img[max(0, t):b, r - 1] += 1
      if t >= 0:
        rt += 1
      if b <= h:
        rb += 1

    if lt == 2:
      img[t, l] -= 1
    if rt == 2:
      img[t, r - 1] -= 1
    if lb == 2:
      img[b - 1, l] -= 1
    if rb == 2:
      img[b - 1, r - 1] -= 1

    pass

    # img[y, x:r] += 1
    # img[b-1, x:r] += 1
    # img[y:b, x] += 1
    # img[y:b, r-1] += 1

  # def AddOneSquare(img: np.ndarray, x, y, edge_length):
  #   h, w = img.shape
  #   for _x in range(-(edge_length // 2), (edge_length // 2)):
  #     if (x + _x < w) and (x + _x > 0):
  #       if y + (edge_length // 2) < h:
  #         img[y + (edge_length // 2)][x + _x] += 1
  #       if y - (edge_length // 2) >= 0:
  #         img[y - (edge_length // 2)][x + _x] += 1
  #   for _y in range(-(edge_length // 2), (edge_length // 2)):
  #     if (y + _y < h) and (y + _y > 0):
  #       if x + (edge_length // 2) < w:
  #         img[y + _y][x + (edge_length // 2)] += 1
  #       if x - (edge_length // 2) >= 0:
  #         img[y + _y][x - (edge_length // 2)] += 1

  minLength = length if minLength is None else minLength
  maxLength = length if maxLength is None else maxLength

  maxValue = 36893488147419103000
  shape = img.shape

  if maxLength * 4 > maxValue:
    raise ExceedMaxValue(f"maxLength * 4 is {maxLength * 4}, but need less than {maxValue}")

  if (type(length) is not int
      or type(maxLength) is not int
      or type(minLength) is not int):
    raise TypeError(f'{{length, maxLength, minLength}} type must is int')

  if maxLength < minLength:
    raise ValueError(f"maxLength must great than minLength")

  if minLength < 0:
    raise  ValueError(f'minLength must position value')

  spaceLength = maxLength - minLength + 1

  result = np.zeros((spaceLength, ) + shape,
           dtype=np.uint64)

  for y in range(img.shape[0]):
    for x in range(img.shape[1]):
      if img[y][x] != 0:
        for adj_edge_length in range(spaceLength):
          AddOneSquare(result[adj_edge_length], x, y, minLength + adj_edge_length)
  return result


def main():
  frameWidth = 1280
  frameHeight = 720

  cap = cv2.VideoCapture(0)
  atexit.register(lambda: cap.release())
  cap.set(cv2.CAP_PROP_FRAME_WIDTH, frameWidth)
  cap.set(cv2.CAP_PROP_FRAME_HEIGHT, frameHeight)

  cv2.namedWindow("Parameters")
  cv2.resizeWindow("Parameters", 640, 240)
  cv2.createTrackbar("Threshold1", "Parameters", 23, 255, empty)
  cv2.createTrackbar("Threshold2", "Parameters", 20, 255, empty)
  cv2.createTrackbar("Score", "Parameters", 90, 255, empty)

  while True:
    success, img = cap.read()
    # img = img[110:610, 390:890]
    # img = img[260:410, 540:690]
    img = img[150:520, 430:800]

    imgBlur = cv2.GaussianBlur(img, (7,7), 1)
    #cv2.imshow("Blur", imgBlur)
    imgGray = cv2.cvtColor(imgBlur, cv2.COLOR_BGR2GRAY)
    #cv2.imshow("Gray", imgGray)

    threshold1 = cv2.getTrackbarPos("Threshold1", "Parameters")
    threshold2 = cv2.getTrackbarPos("Threshold2", "Parameters")
    imgCanny = cv2.Canny(imgGray, threshold1, threshold2)
    # cv2.rectangle(imgCanny, (150, 150), (180, 180), (255,255,255), 1)
    cv2.imshow("Canny", imgCanny)

    cv2.rectangle(img, (210, 210), (290, 290), (255, 0, 0), 1)
    rects_score = houghSquare(imgCanny, 80)
    rects_score = rects_score[0]
    score = cv2.getTrackbarPos("Score", "Parameters")
    loc = np.where((rects_score >= score) & (rects_score <= 160))
    i = 0
    for y, x in zip(*loc):
      cv2.rectangle(img, (x-40, y-40), (x+40, y+40), (0, 255,0), 2)

    cv2.imshow("Original", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
      exit()


if __name__ == "__main__":
  atexit.register(lambda: cv2.destroyAllWindows())
  try:
    main()
  except Exception as e:
    print(e)
  finally:
    exit()

