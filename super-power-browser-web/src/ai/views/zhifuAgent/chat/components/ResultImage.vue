<template>
  <div ref="root" class="result-image">
    <button
      v-if="src"
      class="preview-button"
      type="button"
      :title="name"
      @click="emit('open-image', src, name)"
    >
      <img :src="src" :alt="name" />
      <span class="preview-hint">查看大图</span>
    </button>
    <span v-else class="preview-status">
      {{ error || "正在加载图片预览…" }}
      <button v-if="error" type="button" @click="openFile">打开图片文件</button>
    </span>
    <div class="image-actions">
      <span class="image-name" :title="name">{{ name }}</span>
      <button type="button" class="location-button" @click="revealFile">打开所在文件夹</button>
      <el-dropdown trigger="click" @command="command">
        <button type="button" class="more-button" aria-label="更多图片操作">⋯</button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="open">打开原文件</el-dropdown-item>
            <el-dropdown-item command="copy">复制路径</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import {
  zhifuPreviewResultImage,
  zhifuOpenResultFile,
  zhifuRevealResultFile,
} from "@/ai/utils/electronApi";
import { errorMessage } from "@/ai/store/modules/zhifu-agent.store";

async function openFile() {
  try {
    await zhifuOpenResultFile(props.path);
  } catch {
    ElMessage.error("图片文件无法打开，请确认文件仍然存在。");
  }
}
async function revealFile() {
  try {
    await zhifuRevealResultFile(props.path);
  } catch {
    ElMessage.error("无法打开所在文件夹，请确认图片文件仍然存在。");
  }
}
async function command(action: string) {
  if (action === "open") {
    await openFile();
    return;
  }
  if (action !== "copy") return;
  try {
    await navigator.clipboard.writeText(props.path);
    ElMessage.success("路径已复制");
  } catch {
    ElMessage.error("复制失败，请重试。");
  }
}
const props = defineProps<{ path: string; name: string }>();
const emit = defineEmits<{ "open-image": [src: string, name: string] }>();
const root = ref<HTMLElement | null>(null);
const src = ref("");
const error = ref("");
let observer: IntersectionObserver | undefined;
let disposed = false;
async function load() {
  observer?.disconnect();
  try {
    const image = await zhifuPreviewResultImage(props.path);
    if (!disposed) src.value = image;
  } catch (cause) {
    if (!disposed) error.value = `${errorMessage(cause)}`;
  }
}
onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    load();
    return;
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) load();
  });
  if (root.value) observer.observe(root.value);
});
onUnmounted(() => {
  disposed = true;
  observer?.disconnect();
});
</script>

<style scoped>
.result-image {
  margin-top: 10px;
  width: 400px;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.preview-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 8px;
  border: 0;
  background: #f8f9fb;
  cursor: zoom-in;
}
.preview-hint {
  position: absolute;
  right: 14px;
  bottom: 14px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 4px #00000014;
}
.image-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #eaecf0;
  min-width: 0;
  flex-wrap: wrap;
}
.image-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.image-actions button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 4px 0;
}
.location-button {
  color: #667085;
  white-space: nowrap;
  flex-shrink: 0;
}
.location-button:hover,
.more-button:hover {
  color: #409eff;
}
.more-button {
  color: #667085;
  min-width: 24px;
}
.image-actions button:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: 2px;
  border-radius: 3px;
}
.preview-button:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: -2px;
}
img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
}
span {
  color: #667085;
  font-size: 12px;
}
.preview-status {
  display: block;
  padding: 12px;
}
</style>
