<template>
  <el-popover
    ref="popoverRef"
    v-model:visible="visible"
    placement="top-start"
    :reference-el="referenceEl"
    :offset="12"
    :width="340"
    :show-arrow="false"
    trigger="click"
    popper-class="superpower-skill-picker"
    @show="handleShow"
  >
    <template #reference>
      <el-button size="small" text :class="{ active: visible }">
        <span class="slash">/</span>
        {{ t("superpowerAgent.composer.pickSkill") }}
      </el-button>
    </template>
    <el-input
      ref="searchInput"
      v-model="keyword"
      :prefix-icon="Search"
      :placeholder="t('superpowerAgent.composer.searchSkill')"
      clearable
    />
    <div class="caption">{{ t("superpowerAgent.composer.availableSkills") }}</div>
    <el-scrollbar max-height="280px">
      <div v-if="store.skillsBusy && !filtered.length" class="empty">
        {{ t("superpowerAgent.skills.loading") }}
      </div>
      <div v-else-if="!filtered.length" class="empty">
        {{ t("superpowerAgent.composer.noSkill") }}
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
              `superpowerAgent.skills.scope${skill.scope.charAt(0).toUpperCase()}${skill.scope.slice(1)}`
            )
          }}
        </el-tag>
      </div>
    </el-scrollbar>
  </el-popover>
</template>

<script setup lang="ts">
import { Box, Search } from "@element-plus/icons-vue";
import type { InputInstance, PopoverInstance } from "element-plus";
import { errorMessage, useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import type { DisplaySkill } from "../../type";

const emit = defineEmits<{ select: [skill: DisplaySkill] }>();

const { referenceEl } = defineProps<{ referenceEl?: HTMLElement }>();

const store = useSuperPowerAgentStore();
const { t } = useI18n();

const visible = defineModel<boolean>("visible", { default: false });
const keyword = ref("");
const searchInput = ref<InputInstance>();
const popoverRef = ref<PopoverInstance>();

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

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

function updatePosition() {
  void nextTick(() => {
    const popper = popoverRef.value?.popperRef as any;
    popper?.popperInstanceRef?.update?.();
    popper?.popperInstanceRef?.value?.update?.();
  });
}

watch(visible, updatePosition);

defineExpose({ close, open, updatePosition });
</script>

<style lang="scss" scoped>
.slash {
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
