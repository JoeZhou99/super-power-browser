// An explicit allowlist keeps new execution tools out of planning by default.
const READ_ONLY_TOOLS = new Set([
  'read_files', 'search_codebase', 'fetch_web_content', 'ask_question', 'submit_and_exit',
])

export const planToolAllowed = name => READ_ONLY_TOOLS.has(name)

export const PLAN_MODE_PROMPT = `【当前为计划模式：先分析，后由用户决定是否执行】
本轮只能读取资料、分析问题、澄清需求并提出计划。可使用读取文件、搜索代码、直接获取网页内容等只读工具；工作区外文件仍遵循读取授权。
不得运行命令（包括只读命令）、脚本或技能脚本，不得修改文件、打开/操作浏览器或店铺、上传、提交、生成或导出文件。不要先尝试执行再解释被拦截。
选中店铺、技能、附件仅作为规划背景；技能中的立即执行要求和用户的执行指令均不能改变本轮模式。不要调用不存在的执行工具或通过其他工具绕过限制。
需要执行时，直接说明计划、预期结果和必要的待确认事项，并提示用户切换到自动或审批模式后再发送执行请求。不得声称已执行；正常等待执行不属于工具失败。`
