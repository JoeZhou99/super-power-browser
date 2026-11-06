<template>
  <el-dialog
    class="base-dialog"
    :id="dialogDomId"
    ref="dialogRef"
    v-model="configs.isShowDialog"
    :width="configs.width || '60%'"
    :top="configs.top || '15vh'"
    :append-to-body="configs.appendToBody"
    :modal="configs.modal"
    :before-close="handleBeforeClose"
    :close-on-click-modal="configs.closeOnClickModal"
    :close-on-press-escape="configs.closeOnPressEscape"
    :destroy-on-close="configs.destroyOnClose"
    :draggable="configs.draggable"
    @opened="onDialogOpened"
    @closed="handleClosed"
    :show-close="configs.showClose"
  >
    <template #header="{ close, titleId, titleClass }" v-if="configs.header">
      <slot name="header" :close>
        <div class="my-header">
          <h4 :id="titleId" :class="titleClass">{{ configs.title }}</h4>
          <div class="el-dialog__headerbtn">
            <el-icon
              class="cursor-pointer wh-16 close"
              v-if="configs.customShowClose"
              @click="close"
            >
              <CloseBold />
            </el-icon>
          </div>
        </div>
      </slot>
    </template>
    <!-- @slot content 内容容器 -->
    <template #default>
      <slot name="content"></slot>
    </template>
    <!-- @slot footerBtn 按钮容器 -->
    <template #footer v-if="configs.footer">
      <slot name="footer">
        <el-button @click="cancel">
          {{ t("globalCommonWord.cancel_") }}
        </el-button>
        <el-button type="primary" @click="confirm">
          {{ t("globalCommonWord.confirm_") }}
        </el-button>
      </slot>
    </template>
    <!-- @slot extraContent 按钮拓展容器 -->
    <template #extraContent>
      <slot name="extraContent" />
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { CloseBold } from "@element-plus/icons-vue";
import { reactive, provide, ref, watch, nextTick, onUnmounted, toRefs } from "vue";
import { useI18n } from "vue-i18n";

export interface DialogObj {
  title?: any;
  isShowDialog: boolean;
  width?: string;
  parameter?: Record<string, any>; // 弹窗携带的参数
  notNeedHandleClose?: boolean; // 是否不需要处理关闭事件
  top?: string; // 距离顶部距离
  customShowClose?: boolean; // 是否显示自定义的关闭按钮
  showClose?: boolean; // 是否显示关闭按钮
  footer?: boolean; // 是否显示底部按钮区域
  header?: boolean; // 是否显示头部
  modal?: boolean; // 是否显示遮罩层
  closeOnClickModal?: boolean; // 点击弹窗外区域是否关闭弹窗
  appendToBody?: boolean; // 挂载到body上
  closeOnPressEscape?: boolean; // 按Esc键是否关闭弹窗
  destroyOnClose?: boolean; // 关闭时销毁组件
  isConfirmed?: boolean; // 是否显示确认
  draggable?: boolean; // 是否可拖拽
  /** 是否可拖拉调整宽高 */
  resizable?: boolean;
  /**
   * 为 true（默认）时仅右下角拖放，且宽高按打开/按下鼠标时的比例等比缩放；
   * 为 false 时恢复右边、下边、右下角独立拉伸。
   */
  resizeLockAspect?: boolean;
  /** 可调节最小宽度（px） */
  resizeMinWidth?: number;
  /** 可调节最小高度（px） */
  resizeMinHeight?: number;
  /** 可调节最大宽度（px），默认贴近视口 */
  resizeMaxWidth?: number;
  /** 可调节最大高度（px），默认贴近视口 */
  resizeMaxHeight?: number;
  allowExternalClose?: boolean; // 是否外部控制关闭弹窗
  isNeedHandleClose?: boolean; // 是否需要处理关闭事件
}
const DEFAULT_DIALOG_CONFIGS = {
  customShowClose: true,
  showClose: false,
  footer: true,
  header: true,
  modal: true,
  closeOnClickModal: false,
  appendToBody: true,
  closeOnPressEscape: false,
  destroyOnClose: false,
  isConfirmed: false,
  draggable: true,
  resizable: true,
  resizeLockAspect: true,
  resizeMinWidth: 320,
  resizeMinHeight: 160,
  allowExternalClose: false,
  isNeedHandleClose: false,
};
const props = defineProps<{
  dialogObj: DialogObj;
}>();

const { t } = useI18n();
const emit = defineEmits(["confirm", "beforeClose", "cancel", "closed"]);
let configs: Partial<DialogObj> = reactive({
  ...DEFAULT_DIALOG_CONFIGS,
  ...toRefs(props.dialogObj),
});

/** el-dialog Teleport 后用于定位面板 DOM */
const dialogDomId = ref(`base-dialog-${Math.random().toString(36).slice(2, 11)}`);

function findDialogSurfaceEl(): HTMLElement | null {
  const rawId = dialogDomId.value;
  if (!rawId || typeof document === "undefined") return null;
  const el = document.getElementById(rawId);
  if (!el) return null;
  if (el.classList.contains("el-dialog")) return el;
  const inner = el.querySelector?.(".el-dialog");
  return inner instanceof HTMLElement ? inner : null;
}

type ResizeDir = "e" | "s" | "se";
let resizeCleanup: (() => void) | null = null;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 等比缩放：根据鼠标位移选 sW/sH 中更“主导”的一维，再 clamp 到 min/max 框 */
function applyProportionalResize(
  startW: number,
  startH: number,
  dx: number,
  dy: number,
  minW: number,
  minH: number,
  maxW: number,
  maxH: number
): { w: number; h: number } {
  const sW = (startW + dx) / startW;
  const sH = (startH + dy) / startH;
  const relX = Math.abs(dx) / Math.max(startW, 1);
  const relY = Math.abs(dy) / Math.max(startH, 1);
  let s = relX >= relY ? sW : sH;
  const sMin = Math.max(minW / Math.max(startW, 1), minH / Math.max(startH, 1));
  const sMax = Math.min(maxW / Math.max(startW, 1), maxH / Math.max(startH, 1));
  s = clamp(s, sMin, sMax);
  return {
    w: Math.round(startW * s),
    h: Math.round(startH * s),
  };
}

function detachResizeHandles() {
  resizeCleanup?.();
  resizeCleanup = null;
}

function attachResizeHandles(retry = 0) {
  detachResizeHandles();
  if (configs.resizable === false) return;

  const dialogEl = findDialogSurfaceEl();
  if (!dialogEl) {
    if (retry < 8) {
      requestAnimationFrame(() => attachResizeHandles(retry + 1));
    }
    return;
  }

  if (dialogEl.querySelector(".base-dialog__resize-root")) return;

  const minW = configs.resizeMinWidth ?? 320;
  const minH = configs.resizeMinHeight ?? 160;
  const maxW = configs.resizeMaxWidth ?? Math.max(minW, window.innerWidth - 24);
  const maxH = configs.resizeMaxHeight ?? Math.max(minH, window.innerHeight - 24);

  dialogEl.style.boxSizing = "border-box";
  dialogEl.classList.add("base-dialog--resizable");

  const root = document.createElement("div");
  root.className = "base-dialog__resize-root";
  root.setAttribute("aria-hidden", "true");

  const makeHandle = (dir: ResizeDir) => {
    const h = document.createElement("div");
    h.className = `base-dialog__resize-handle base-dialog__resize-handle--${dir}`;
    h.dataset.dir = dir;
    return h;
  };

  const lockAspect = configs.resizeLockAspect !== false;
  const handleDirs: ResizeDir[] = lockAspect ? ["se"] : ["e", "s", "se"];
  for (const dir of handleDirs) {
    root.appendChild(makeHandle(dir));
  }
  dialogEl.appendChild(root);

  let mode: ResizeDir | null = null;
  let activeResizeHandle: HTMLElement | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  const endResize = () => {
    window.removeEventListener("mouseup", onWindowMouseUp, true);
    window.removeEventListener("blur", endResize);
    if (activeResizeHandle && activePointerId != null) {
      try {
        if (activeResizeHandle.hasPointerCapture(activePointerId)) {
          activeResizeHandle.releasePointerCapture(activePointerId);
        }
      } catch {
        /* ignore */
      }
      activeResizeHandle.removeEventListener("pointermove", onPointerMove);
      activeResizeHandle.removeEventListener("pointerup", onPointerUp);
      activeResizeHandle.removeEventListener("pointercancel", onPointerUp);
    }
    activeResizeHandle = null;
    activePointerId = null;
    mode = null;
    document.body.style.removeProperty("user-select");
    document.body.style.removeProperty("cursor");
  };

  /** 兜底：部分环境下 capture 异常或事件丢失时仍能结束拖动 */
  const onWindowMouseUp = () => {
    endResize();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!mode) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      endResize();
      return;
    }
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let w: number;
    let h: number;
    if (lockAspect) {
      const wh = applyProportionalResize(startW, startH, dx, dy, minW, minH, maxW, maxH);
      w = wh.w;
      h = wh.h;
    } else {
      w = startW;
      h = startH;
      if (mode === "e" || mode === "se") w = startW + dx;
      if (mode === "s" || mode === "se") h = startH + dy;
      w = clamp(w, minW, maxW);
      h = clamp(h, minH, maxH);
    }
    dialogEl.style.width = `${w}px`;
    dialogEl.style.height = `${h}px`;
    dialogEl.style.maxHeight = "none";
    dialogEl.style.display = "flex";
    dialogEl.style.flexDirection = "column";
  };

  const onPointerUp = (_e: PointerEvent) => {
    endResize();
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const t = (e.target as HTMLElement)?.closest?.(
      ".base-dialog__resize-handle"
    ) as HTMLElement | null;
    const d = t?.dataset?.dir as ResizeDir | undefined;
    if (!d || !t) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = dialogEl.getBoundingClientRect();
    startW = rect.width;
    startH = rect.height;
    startX = e.clientX;
    startY = e.clientY;
    mode = d;
    activeResizeHandle = t;
    activePointerId = e.pointerId;
    try {
      t.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      lockAspect || d === "se" ? "nwse-resize" : d === "e" ? "ew-resize" : "ns-resize";
    t.addEventListener("pointermove", onPointerMove);
    t.addEventListener("pointerup", onPointerUp);
    t.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("mouseup", onWindowMouseUp, true);
    window.addEventListener("blur", endResize);
  };

  root.addEventListener("pointerdown", onDown);

  resizeCleanup = () => {
    root.removeEventListener("pointerdown", onDown);
    endResize();
    root.remove();
    dialogEl.classList.remove("base-dialog--resizable");
    dialogEl.style.removeProperty("width");
    dialogEl.style.removeProperty("height");
    dialogEl.style.removeProperty("max-height");
    dialogEl.style.removeProperty("display");
    dialogEl.style.removeProperty("flex-direction");
  };
}

function onDialogOpened() {
  if (configs.resizable === false) return;
  void nextTick(() => attachResizeHandles());
}

watch(
  () => configs.resizable,
  (v) => {
    if (v === false) detachResizeHandles();
    else if (configs.isShowDialog) void nextTick(() => attachResizeHandles());
  }
);

// 确认按钮事件
const confirm = () => {
  if (!configs.allowExternalClose) {
    configs.isShowDialog = false;
  }
  emit("confirm", configs.parameter);
};

// 取消按钮事件
const dialogRef = ref<{handleClose:()=>void}|null>(null);
const cancel = () => {
  if (configs.isNeedHandleClose) {
    dialogRef?.value?.handleClose();
  } else {
    emit("cancel");
    configs.isShowDialog = false;
  }
};
provide("cancel", cancel);
// 关闭前的回调函数
const handleBeforeClose = (done: () => void) => {
  if (configs.isNeedHandleClose) {
    emit("beforeClose", done);
  } else {
    done();
  }
};

// 监听dialogObj的变化，更新configs
watch(
  props.dialogObj,
  (val) => {
    Object.assign(configs, val);
    // console.log(configs);
  },
  { deep: true, immediate: true }
);

// 关闭后的回调函数
const handleClosed = () => {
  detachResizeHandles();
  emit("closed");
  configs.isShowDialog = false;
};

onUnmounted(() => {
  detachResizeHandles();
});
</script>

<style lang="scss">
.base-dialog {
  background: #ffffff;

  .my-header {
    display: flex;
    flex-direction: row;
    gap: 16px;
    justify-content: space-between;
  }

  .el-dialog__headerbtn {
    top: 20px !important;
    right: 30px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 24px;

    .close {
      &:hover {
        color: var(--el-color-primary);
      }

      .el-icon {
        width: 1.5em;
        height: 1.5em;
      }
    }
  }

  .el-dialog__header {
    padding: 20px 30px;

    span {
      font-size: 18px;
      font-weight: bold;
      color: #303133;
    }
  }

  .el-dialog__footer {
    padding: 0px 24px 16px 24px;
    border-top: none !important;
  }
}
</style>
