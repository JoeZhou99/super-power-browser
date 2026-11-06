<template>
  <el-dialog
    :model-value="!!message"
    :title="t('zhifuAgent.skills.installFailed')"
    width="420px"
    append-to-body
    @close="message = ''"
  >
    <p class="message">{{ message }}</p>
    <template #footer>
      <el-button type="primary" @click="message = ''">
        {{ t("zhifuAgent.common.gotIt") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
const message = defineModel<string>({ default: "" });
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.message {
  margin: 0;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-all;
}
</style>
