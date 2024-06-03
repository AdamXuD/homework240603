<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { detectHappy, loadHaarModels } from './utils'

const viewportHeight = ref(window.innerHeight + 'px')
window.addEventListener('resize', () => {
  viewportHeight.value = window.innerHeight + 'px'
})

const menuList = ['Camera', 'Upload']
const activeItem = ref(menuList[0])

const isLoaded = ref(false)

const isHappy = ref(false)

loadHaarModels().then(() => {
  isLoaded.value = true
})

const cameraVideoElem = ref<HTMLVideoElement>()
const cameraFacingMode = ref<'off' | 'user' | 'environment'>('off')
const cameraModeGroup: {
  label: string
  value: 'user' | 'environment' | 'off'
}[] = [
  { label: '前置', value: 'user' },
  { label: '后置', value: 'environment' },
  { label: '关闭', value: 'off' }
]
const cameraCapture = (facingMode: 'off' | 'user' | 'environment' = 'user') => {
  if (cameraFacingMode.value === facingMode) return
  if (cameraVideoElem.value && cameraVideoElem.value.srcObject) {
    ;(cameraVideoElem.value.srcObject as MediaStream).getTracks().forEach((track) => {
      track.stop()
    })
  }
  cameraFacingMode.value = facingMode

  if (facingMode === 'off') return
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: facingMode } }) // user
    .then(async (stream) => {
      if (cameraVideoElem.value) {
        cameraVideoElem.value.srcObject = stream
        cameraVideoElem.value.setAttribute('playsinline', 'true')
        cameraVideoElem.value.play()
      }
      const canvasElem = document.createElement('canvas')
      const handler = setInterval(async () => {
        if (!cameraVideoElem.value) return
        canvasElem.width = cameraVideoElem.value.videoWidth
        canvasElem.height = cameraVideoElem.value.videoHeight
        if (canvasElem.width === 0 || canvasElem.height === 0) return
        const context = canvasElem.getContext('2d')
        if (!context) return
        context.drawImage(cameraVideoElem.value, 0, 0, canvasElem.width, canvasElem.height)
        isHappy.value = await detectHappy(canvasElem)
        if (stream.getTracks().every((track) => track.readyState === 'ended')) {
          clearInterval(handler)
        }
      }, 500)
    })
  return true
}

const uploadImageElem = ref<HTMLImageElement>()
const fileInputElem = ref<HTMLInputElement>()
const file = ref<File>()

const onFileUploadBtnClicked = () => {
  fileInputElem.value && fileInputElem.value.click()
}

const onFileUploaded = () => {
  file.value = fileInputElem.value?.files?.[0]
}

watch(file, () => {
  nextTick(async () => {
    if (!file.value || !uploadImageElem.value) return
    uploadImageElem.value.src = URL.createObjectURL(file.value)
    isHappy.value = await detectHappy(uploadImageElem.value)
  })
  console.log(!!file.value)
})
</script>

<template>
  <div
    class="h-full w-full md:w-2/3 mx-auto flex flex-col items-stretch overflow-hidden"
    :style="{ height: viewportHeight }"
  >
    <h1 class="text-3xl px-8 py-8 text-center">
      {{ isHappy ? 'Good Smile 😇' : 'Please Smile 😊' }}
    </h1>
    <p class="text-sm text-center mb-2 text-gray-500">
      该服务为Serverless应用 开发者保证不存储任何用户数据
    </p>
    <div v-if="isLoaded" class="flex-1 min-h-0 flex flex-col items-stretch">
      <ul class="flex flex-row">
        <li
          v-for="(item, index) in menuList"
          :key="index"
          class="px-4 py-2 mr-4 rounded-t-md text-white cursor-pointer transition-colors duration-300"
          :class="
            isHappy
              ? activeItem == item
                ? 'bg-orange-400'
                : 'bg-orange-600'
              : activeItem == item
                ? 'bg-slate-500'
                : 'bg-slate-700'
          "
          @click="(file = undefined) || cameraCapture('off') || (activeItem = item)"
        >
          {{ item }}
        </li>
      </ul>
      <div
        class="flex-1 min-h-0 flex items-stretch rounded-tr-lg shadow-lg transition-colors duration-300"
        :class="isHappy ? 'bg-orange-400' : 'bg-slate-500'"
      >
        <div
          v-if="activeItem == menuList[0]"
          class="p-4 md:p-8 flex-1 min-h-0 flex flex-col items-stretch overflow-hidden"
        >
          <div
            v-if="cameraFacingMode == 'off'"
            class="flex-1 min-h-0 flex justify-center items-center outline-dashed outline-white rounded-lg cursor-pointer"
            @click="cameraCapture()"
          >
            <div class="text-white flex flex-col justify-center items-center">
              <i class="text-9xl bi bi-camera"></i>
              <p class="text-xl mt-4">点击开启摄像头，是否继续？</p>
            </div>
          </div>
          <div v-else class="flex-1 min-h-0 flex flex-col items-stretch">
            <div
              class="flex-1 min-h-0 flex flex-col items-center p-4 mb-4 rounded-lg outline-dashed outline-white"
            >
              <video ref="cameraVideoElem" class="h-full object-contain rounded-lg"></video>
            </div>
            <ul class="flex items-center justify-start font-bold">
              <li
                class="cursor-pointer select-none mr-4 px-4 py-2 flex items-center justify-center rounded-full shadow-lg text-white"
                :class="isHappy ? 'bg-yellow-400' : 'bg-gray-400'"
                v-for="item in cameraModeGroup"
                :key="item.value"
                @click="cameraCapture(item.value)"
              >
                <div
                  class="bg-white w-4 h-4 mr-2 rounded-full shadow-lg flex items-center justify-center"
                >
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="isHappy ? 'bg-yellow-400' : 'bg-gray-400'"
                    v-if="item.value === cameraFacingMode"
                  ></div>
                </div>
                {{ item.label }}
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="p-4 md:p-8 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div
            v-if="file"
            class="mb-8 flex-1 w-full min-h-0 overflow-hidden flex flex-col items-center p-4 rounded-lg outline-dashed outline-white"
          >
            <img ref="uploadImageElem" class="h-full object-contain rounded-lg" alt="图片" />
          </div>
          <div
            class="flex justify-center items-center w-full outline-dashed outline-white rounded-lg cursor-pointer"
            @click="onFileUploadBtnClicked"
            :class="!file ? 'h-full' : 'h-16'"
          >
            <input
              type="file"
              accept="image/*"
              ref="fileInputElem"
              style="display: none"
              @change="onFileUploaded"
            />
            <div
              class="text-white flex justify-center items-center"
              :class="!file ? 'flex-col' : 'flex-row'"
            >
              <i class="bi bi-box-arrow-up" :class="!file ? 'text-9xl mb-8' : 'text-4xl mr-4'"></i>
              <p class="text-xl">点击此处上传文件！</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="flex-1 flex flex-col items-stretch justify-center">
      <i class="text-9xl bi bi-cloud-download animate-bounce text-center mb-8"></i>
      <p class="text-xl text-center">模型加载中，请稍后...</p>
    </div>
  </div>
</template>

<style scoped></style>
