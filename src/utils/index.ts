import cv from '@techstark/opencv-js'

let faceCascade: cv.CascadeClassifier
let smileCascade: cv.CascadeClassifier

export async function loadDataFile(cvFilePath: string, url: string) {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const data = new Uint8Array(buffer)
  cv.FS_createDataFile('/', cvFilePath, data, true, false, false)
}

export async function loadHaarModels() {
  const frontalfaceReq = loadDataFile(
    'haarcascade_frontalface_default.xml',
    '/static/haarcascade_frontalface_default.xml'
  ).then(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          faceCascade = new cv.CascadeClassifier()
          faceCascade.load('haarcascade_frontalface_default.xml')
          resolve(null)
        }, 2000)
      })
  )
  const smileReq = loadDataFile('haarcascade_smile.xml', '/static/haarcascade_smile.xml').then(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          smileCascade = new cv.CascadeClassifier()
          smileCascade.load('haarcascade_smile.xml')
          resolve(null)
        }, 2000)
      })
  )
  return Promise.all([frontalfaceReq, smileReq])
}

function haarDetect(img: cv.Mat, faceCascade: cv.CascadeClassifier) {
  const msize = new cv.Size(0, 0)
  const newImg = img
  const gray = new cv.Mat()
  const targets = new cv.RectVector()
  cv.cvtColor(newImg, gray, cv.COLOR_RGBA2GRAY, 0)
  faceCascade.detectMultiScale(gray, targets, 1.2, 3, 0, msize)

  const location = []
  for (let i = 0; i < targets.size(); ++i) {
    const face = targets.get(i)
    location.push([face.x, face.y, face.x + face.width, face.y + face.height])
  }

  gray.delete()
  targets.delete()
  return location
}

function haarDetectFaces(img: cv.Mat) {
  return haarDetect(img, faceCascade)
}

function haarDetectSmiles(img: cv.Mat) {
  return haarDetect(img, smileCascade)
}

export function detectHappy(elem: HTMLCanvasElement | HTMLImageElement) {
  try {
    const image = cv.imread(elem)
    const faces = haarDetectFaces(image)
    if (faces.length === 0) return false
    const maxAreaFace = faces.reduce((maxFace, currentFace) => {
      const maxArea = (maxFace[2] - maxFace[0]) * (maxFace[3] - maxFace[1])
      const currentArea = (currentFace[2] - currentFace[0]) * (currentFace[3] - currentFace[1])
      return currentArea > maxArea ? currentFace : maxFace
    })
    const maxAreaFaceRect = new cv.Rect(
      maxAreaFace[0],
      maxAreaFace[1],
      maxAreaFace[2] - maxAreaFace[0],
      maxAreaFace[3] - maxAreaFace[1]
    )
    const smiles = haarDetectSmiles(image.roi(maxAreaFaceRect))
    const isHappy = smiles.length > 0
    return isHappy
  } catch (e) {
    return false
  }
}
