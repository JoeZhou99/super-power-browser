<template>
  <div class="file-card">
    <button class="file-main" type="button" :title="name" @click="open">
      <span class="file-icon" :class="{ spreadsheet }"><Document /></span>
      <span class="file-info">
        <strong>{{ name }}</strong>
        <span>{{ description }}</span>
      </span>
    </button>
    <el-dropdown trigger="click" @command="command">
      <button class="file-more" type="button" aria-label="更多文件操作"><MoreFilled /></button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="folder">打开所在文件夹</el-dropdown-item>
          <el-dropdown-item command="copy">复制路径</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ElMessage } from "element-plus";
import { Document, MoreFilled } from "@element-plus/icons-vue";
import { zhifuOpenResultFile, zhifuRevealResultFile } from "@/ai/utils/electronApi";
import { resultFileName } from "../../utils/resultArtifacts";
const props = defineProps<{ path: string; details?: string[] }>();
const name = computed(() => resultFileName(props.path));
const spreadsheet = computed(() => /\.(xlsx?|csv)$/i.test(props.path));
const description = computed(() =>
  [
    spreadsheet.value ? "Excel 表格" : `${props.path.split(".").pop()?.toUpperCase()} 文件`,
    ...new Set(props.details || []),
  ].join(" · ")
);
async function open() {
  try {
    await zhifuOpenResultFile(props.path);
  } catch {
    ElMessage.error("无法打开文件，请确认文件仍然存在且已安装对应软件。");
  }
}
async function command(action: string) {
  try {
    if (action === "folder") await zhifuRevealResultFile(props.path);
    else if (action === "copy") {
      await navigator.clipboard.writeText(props.path);
      ElMessage.success("路径已复制");
    }
  } catch {
    ElMessage.error(
      action === "copy" ? "复制失败，请重试。" : "无法打开所在文件夹，请确认文件仍然存在。"
    );
  }
}
</script>

<style scoped>
.file-card {
  display: flex;
  align-items: center;
  width: 360px;
  max-width: 100%;
  border: 1px solid #eaecf0;
  border-radius: 12px;
  background: #f8f9fb;
  transition: background 0.15s;
}
.file-card:hover {
  background: #f0f2f5;
}
button {
  font: inherit;
  border: 0;
  background: transparent;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: 2px;
  border-radius: 8px;
}
.file-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 14px;
  text-align: left;
}
.file-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 42px;
  border-radius: 8px;
  color: #667085;
  background: #e9edf3;
}
.file-icon.spreadsheet {
  color: #168654;
  background: #e1f1e9;
}
.file-icon svg {
  width: 23px;
  height: 23px;
}
.file-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.file-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #344054;
}
.file-info > span {
  font-size: 12px;
  color: #88909f;
}
.file-more {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-right: 8px;
  color: #88909f;
}
.file-more svg {
  width: 17px;
  height: 17px;
}
</style>
