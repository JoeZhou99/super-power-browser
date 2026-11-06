<template>
  <section class="diagnostics">
    <div class="section-title">问题反馈</div>
    <div class="settings-card">
      <p class="section-description">遇到异常时，导出诊断包并连同截图发送给技术支持。</p>
      <el-button @click="visible = true">导出诊断包</el-button>
      <div v-if="result" class="result">
        <span>已导出，问题编号：{{ result.issueId }}</span>
        <el-button link type="primary" @click="reveal">打开所在文件夹</el-button>
      </div>
    </div>
    <el-dialog v-model="visible" title="导出问题诊断包" width="520px" append-to-body>
      <el-form label-position="top">
        <el-form-item label="问题描述与发生时间">
          <el-input
            v-model="description"
            type="textarea"
            :rows="4"
            :maxlength="4000"
            placeholder="请描述操作步骤、预期结果、实际结果及发生时间"
          />
        </el-form-item>
        <el-form-item label="相关会话（可选）">
          <el-select
            v-model="conversationId"
            clearable
            placeholder="不包含会话内容"
            style="width: 100%"
          >
            <el-option
              v-for="item in store.conversations"
              :key="item.id"
              :label="item.title || '未命名会话'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日志范围（按文件修改时间）">
          <el-select v-model="hours" style="width: 100%">
            <el-option
              v-for="value in [1, 24, 72]"
              :key="value"
              :label="`最近 ${value} 小时`"
              :value="value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <p class="tip">
        包含版本、近期日志及所选会话内容。自动隐藏常见密钥、令牌、邮箱和手机号；业务内容仍可能保留，发送前请解压检查。不收集附件，不自动上传。
      </p>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="busy" @click="exportPackage">选择位置并导出</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuExportDiagnostics, zhifuRevealResultFile } from "@/ai/utils/electronApi";
const store = useZhifuAgentStore();
const visible = ref(false);
const description = ref("");
const conversationId = ref("");
const hours = ref(24);
const busy = ref(false);
const result = ref<{ issueId: string; path: string } | null>(null);
async function exportPackage() {
  busy.value = true;
  try {
    const conversation = store.conversations.find((item) => item.id === conversationId.value);
    const exported = await zhifuExportDiagnostics({
      description: description.value,
      hours: hours.value,
      conversationId: conversation?.id,
      scheduledTaskId: conversation?.scheduledTaskId,
      conversation: conversation
        ? {
            title: conversation.title,
            messages: conversation.messages
              .slice(-200)
              .map(({ role, content, createdAt, completedAt }) => ({
                role,
                content: content.slice(0, 20000),
                createdAt,
                completedAt,
              })),
            tools: conversation.tools
              .slice(-100)
              .map(({ name, status, messageId, input, output, error }) => ({
                name,
                status,
                messageId,
                input,
                output,
                error,
              })),
          }
        : null,
    });
    if (exported) {
      result.value = exported;
      visible.value = false;
      ElMessage.success("诊断包已保存，请检查后发送给技术支持");
    }
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    busy.value = false;
  }
}
async function reveal() {
  try {
    if (result.value) await zhifuRevealResultFile(result.value.path);
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}
</script>

<style scoped>
.diagnostics {
  margin-bottom: 24px;
}
.section-title {
  margin: 4px 0 10px;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}
.section-description {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}
.tip {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.7;
}
.result {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  color: var(--el-text-color-secondary);
  line-height: 20px;
  font-size: 12px;
}
</style>
