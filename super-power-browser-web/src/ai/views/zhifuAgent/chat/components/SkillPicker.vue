<template>
  <el-popover
    v-model:visible="visible"
    placement="top-start"
    :width="340"
    trigger="click"
    popper-class="zhifu-skill-picker"
    @show="handleShow"
  >
    <template #reference>
      <el-button size="small" text :class="{ active: visible }">
        <span class="hash">#</span>
        {{ t("zhifuAgent.composer.pickSkill") }}
      </el-button>
    </template>
    <el-input
      ref="searchInput"
      v-model="keyword"
      :prefix-icon="Search"
      :placeholder="t('zhifuAgent.composer.searchSkill')"
      clearable
    />
    <div class="caption">{{ t("zhifuAgent.composer.availableSkills") }}</div>
    <el-scrollbar max-height="280px">
      <div v-if="store.skillsBusy && !filtered.length" class="empty">
        {{ t("zhifuAgent.skills.loading") }}
      </div>
      <div v-else-if="!filtered.length" class="empty">
        {{ t("zhifuAgent.composer.noSkill") }}
      </div>
      <div
        v-for="skill in filtered"
        v-else
        :key="`${skill.scope}:${skill.id}`"
        class="skill-item"
        @click="choose(skill)"
      >
        <el-icon class="skill-icon"><Box /></el-icon>
        <div class="skill-copy">
          <strong>{{ skill.name }}</strong>
          <small>{{ skill.description }}</small>
        </div>
        <el-tag size="small" type="info">
          {{
            t(
              `zhifuAgent.skills.scope${skill.scope.charAt(0).toUpperCase()}${skill.scope.slice(1)}`
            )
          }}
        </el-tag>
      </div>
    </el-scrollbar>
  </el-popover>
</template>

<script setup lang="ts">
import { Box, Search } from "@element-plus/icons-vue";
import type { InputInstance } from "element-plus";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import type { DisplaySkill } from "../../type";

const emit = defineEmits<{ select: [skill: DisplaySkill] }>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const visible = ref(false);
const keyword = ref("");
const searchInput = ref<InputInstance>();

const filtered = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  if (!query) return store.selectableSkills;
  return store.selectableSkills.filter((skill) =>
    `${skill.name} ${skill.description || ""}`.toLocaleLowerCase().includes(query)
  );
});

async function handleShow() {
  keyword.value = "";
  nextTick(() => searchInput.value?.focus());
  try {
    await Promise.all([store.loadSkills(), store.loadBoundSkillStore()]);
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}

function choose(skill: DisplaySkill) {
  emit("select", skill);
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.hash {
  margin-right: 2px;
  font-weight: 700;
}

.active {
  color: var(--el-color-primary);
}

.caption {
  margin: 10px 2px 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.empty {
  padding: 18px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.skill-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.skill-icon {
  color: var(--el-color-primary);
}

.skill-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 500;
  }

  small {
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
