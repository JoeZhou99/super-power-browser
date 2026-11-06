<template>
  <Teleport to="body">
    <div v-if="image" class="zhifu-image-viewer" @mousedown.self="emit('close')">
      <div class="viewer-actions">
        <el-icon :title="t('zhifuAgent.imageViewer.download')" @click="download">
          <Download />
        </el-icon>
        <el-icon :title="t('zhifuAgent.common.close')" @click="emit('close')"><Close /></el-icon>
      </div>
      <div class="viewer-stage" @mousedown.self="emit('close')">
        <img :src="image.src" :alt="image.name" :style="{ transform: `scale(${zoom / 100})` }" />
      </div>
      <div class="viewer-zoom">
        <el-button circle text :icon="ZoomOut" :disabled="zoom <= 25" @click="changeZoom(-25)" />
        <el-button text class="zoom-value" @click="zoom = 100">{{ zoom }}%</el-button>
        <el-button circle text :icon="ZoomIn" :disabled="zoom >= 300" @click="changeZoom(25)" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Close, Download, ZoomIn, ZoomOut } from "@element-plus/icons-vue";

const props = defineProps<{ image: { src: string; name: string } | null }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const zoom = ref(100);

watch(
  () => props.image,
  () => {
    zoom.value = 100;
  }
);

function changeZoom(step: number) {
  zoom.value = Math.min(300, Math.max(25, zoom.value + step));
}

/** 按图片真实格式补上扩展名，避免 jpg 名字里存的是另一种格式 */
function downloadName(name: string, src: string) {
  const mime = src.match(/^data:(image\/[a-z0-9.+-]+)/i)?.[1]?.toLowerCase() || "";
  const ext =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : mime === "image/bmp"
              ? "bmp"
              : "";
  const base = (name || "image").replace(/[\\/:*?"<>|]+/g, "-").trim() || "image";
  if (!ext) return base;
  if (new RegExp(`\\.${ext}$`, "i").test(base)) return base;
  if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(base)) {
    return base.replace(/\.(png|jpe?g|webp|gif|bmp)$/i, `.${ext}`);
  }
  return `${base}.${ext}`;
}

/** 把 data URL 还原成原始字节再下载，避免浏览器按页面图片再压一次 */
function dataUrlToBlob(dataUrl: string) {
  const matched = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!matched) return null;
  const mime = matched[1] || "application/octet-stream";
  const payload = matched[3] || "";
  if (matched[2]) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(payload)], { type: mime });
}

function download() {
  if (!props.image) return;
  const src = props.image.src;
  const blob = src.startsWith("data:") ? dataUrlToBlob(src) : null;
  const href = blob ? URL.createObjectURL(blob) : src;
  const link = document.createElement("a");
  link.href = href;
  link.download = downloadName(props.image.name, src);
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (blob) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.image) emit("close");
};

onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
</script>

<style lang="scss" scoped>
.zhifu-image-viewer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  background: rgb(0 0 0 / 78%);
}

.viewer-actions {
  display: flex;
  gap: 18px;
  justify-content: flex-end;
  padding: 16px 20px;
  font-size: 20px;
  color: #fff;

  .el-icon {
    cursor: pointer;
  }
}

.viewer-stage {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: auto;

  img {
    max-width: 90%;
    max-height: 90%;
    transition: transform 0.15s;
  }
}

.viewer-zoom {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 14px;

  :deep(.el-button) {
    color: #fff;
  }
}

.zoom-value {
  min-width: 60px;
}
</style>
