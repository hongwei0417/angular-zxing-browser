import atexit

import cv2
import numpy as np
import time
import threading

def empty(a):
  pass

class ExceedMaxValue(Exception):
  pass


def houghSquare(img: np.ndarray, length, result,
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

  result.append(np.zeros((spaceLength, ) + shape,
           dtype=np.uint64))
  result = result[0]

  i_set = set()

  i_ = 15000
  h, w = img.shape
  sx = w // 3
  sy = h // 3
  cx = w // 2
  cy = h // 2
  #print("*"*30)
  while i_ > 0 and sx >= 0 and sy >= 0:
    i_ -= 1
    # print(tmp_i)
    # timer_start = time.time_ns()
    nx = np.random.normal(loc=cx, scale=sx)
    nx = round(nx)
    nx = max(0, nx)
    nx = min(w - 1, nx)
    ny = np.random.normal(loc=cy, scale=sy)
    ny = round(ny)
    ny = max(0, ny)
    ny = min(h - 1, ny)

    tmp_i = 0
    if (nx, ny) in i_set:
      sx += .01
      sy += .01
      continue
    # while (nx, ny) in i_set:
    #   # print(tmp_i, nx, ny)
    #   tmp_i += 1
    #   if tmp_i > 50:
    #     # cx += np.random.randint(-length//5, length//5)
    #     # cy += np.random.randint(-length//5, length//5)
    #     sx = min(sx + .5, w)
    #     sy = min(sy + .5, h)
    #     tmp_i = 0
    #   nx = np.random.normal(loc=cx, scale=sx)
    #   nx = round(nx)
    #   nx = max(0, nx)
    #   nx = min(w - 1, nx)
    #   ny = np.random.normal(loc=cy, scale=sy)
    #   ny = round(ny)
    #   ny = max(0, ny)
    #   ny = min(h - 1, ny)

    # print(nx, ny, tmp_i)

    i_set.add((nx,ny))
    # print(nx, ny)

    # print('choice: ', time.time_ns() - timer_start)
    # timer_start = time.time_ns()
    sx = max(0.5, sx - .1)
    sy = max(0.5, sy - .1)
    if img[ny][nx] != 0:
      cx = nx
      cy = ny
      sx = max(0.5, sx - .1)
      sy = max(0.5, sy - .1)
      for adj_edge_length in range(spaceLength):
        AddOneSquare(result[adj_edge_length], cx, cy, minLength + adj_edge_length)
    # print('other: ', time.time_ns() - timer_start)
  # print('finish')
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

  # i = 0
  while True:
    # i += 1
    # if i > 10: break
    success, img = cap.read()
    img = img[110:610, 390:890]
    # img = img[260:410, 540:690]
    # img = img[150:520, 430:800]

    imgBlur = cv2.GaussianBlur(img, (7,7), 1)
    cv2.imshow("Blur", imgBlur)
    imgGray = cv2.cvtColor(imgBlur, cv2.COLOR_BGR2GRAY)
    #cv2.imshow("Gray", imgGray)

    threshold1 = cv2.getTrackbarPos("Threshold1", "Parameters")
    threshold2 = cv2.getTrackbarPos("Threshold2", "Parameters")
    imgCanny = cv2.Canny(imgGray, threshold1, threshold2)
    # cv2.rectangle(imgCanny, (150, 150), (180, 180), (255,255,255), 1)
    cv2.imshow("Canny", imgCanny)

    cv2.rectangle(img, (210, 210), (290, 290), (255, 0, 0), 1)
    rects_score = []
    # timer_start = time.time_ns()
    houghSquare(imgCanny, 80, rects_score)
    # print('houghSquare: ', time.time_ns() - timer_start)
    rects_score = rects_score[0][0]
    score = cv2.getTrackbarPos("Score", "Parameters")
    loc = np.where(rects_score >= score)
    # timer_start = time.time_ns()
    i_ = 0
    # print("-"*30)
    for y, x in zip(*(loc)):
      # print(rects_score[y][x])
      cv2.rectangle(img, (x-40, y-40), (x+40, y+40), (0, 255,0), 1)
      cv2.putText(img, f"Score: {rects_score[y][x]}", (x + 30 + 20, y+20), cv2.FONT_HERSHEY_COMPLEX, .7, (np.random.randint(255),np.random.randint(255),np.random.randint(255), 50),1)
      print(rects_score[y][x])
      # print(x, y)
      i_ += 1
      if i_ >= 10: break
    # print('draw: ', time.time_ns() - timer_start)
    # timer_start = time.time_ns()
    cv2.imshow("Original", img)
    # print('show: ', time.time_ns() - timer_start)
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

