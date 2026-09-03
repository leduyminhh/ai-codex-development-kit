// antigravity adapter — Google Antigravity cũng đọc AGENTS.md làm "hợp đồng".
// Mỗi plugin sinh một bộ riêng: build/antigravity/<id>/AGENTS.md + docs/workflow/<stage>.md.
import { agentsFiles } from '../_shared/lib.mjs';

export default {
  name: 'antigravity',
  describe: 'Google Antigravity — build/antigravity/<id>/AGENTS.md + docs/workflow/ cho mỗi plugin',
  build(plugins, { core }) {
    // Skill dùng chung của core (core/skills/, pipeline=false) gộp vào bundle TỪNG plugin —
    // cùng cách core principles được inline per-plugin; chúng hiện ra ở mục recipe on-demand.
    return plugins.flatMap((p) =>
      agentsFiles({ ...p, stages: [...p.stages, ...(core.stages || [])] }, { tool: 'Antigravity', base: p.id, core }),
    );
  },
};
